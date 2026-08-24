const $ = id => document.getElementById(id);

const today = new Date();

const iso = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const EVENTS_KEY = "agenda_personale_events";

let events = [];
let editingEventId = null;

const reminderTimers = new Map();

let alarmAudio = null;
let activeAlarmId = null;

let selectedWeekDate = iso(today);

let monthCursor = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let selectedMonthDate = iso(today);

let calendarCursor = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let selectedCalendarDate = iso(today);


/* =========================================================
   CARICAMENTO DATI
   ========================================================= */

function loadEvents() {

  try {

    const saved = localStorage.getItem(EVENTS_KEY);

    if (!saved) {
      events = [];
      return;
    }

    const parsed = JSON.parse(saved);

    events = Array.isArray(parsed) ? parsed : [];

  } catch (error) {

    console.error("Errore caricamento impegni:", error);

    events = [];

  }

}


/* =========================================================
   SALVATAGGIO
   ========================================================= */

function saveEvents() {

  try {

    localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify(events)
    );

    return true;

  } catch (error) {

    console.error("Errore salvataggio impegni:", error);

    return false;

  }

}


/* =========================================================
   UTILITY
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );

}


function reminderText(value) {

  switch (String(value)) {

    case "0":
      return "all'orario";

    case "10":
      return "10 min prima";

    case "30":
      return "30 min prima";

    case "60":
      return "1 ora prima";

    case "1440":
      return "1 giorno prima";

    default:
      return "nessun promemoria";

  }

}


function eventMap(dateString) {

  return events
    .filter(event => event.date === dateString)
    .sort((a, b) =>
      String(a.time || "").localeCompare(
        String(b.time || "")
      )
    );

}


function startOfWeek(date) {

  const d = new Date(date);

  const day = (d.getDay() + 6) % 7;

  d.setDate(d.getDate() - day);

  d.setHours(0, 0, 0, 0);

  return d;

}


function startOfMonth(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

}


/* =========================================================
   RENDER IMPEGNI
   ========================================================= */

function renderEventList(container, date) {

  const list = eventMap(date);

  if (!list.length) {

    container.innerHTML =
      `<div class="empty">Nessun impegno per questa giornata.</div>`;

    return 0;

  }


  container.innerHTML = list.map(event => `

    <article class="event ${escapeHtml(event.category)}">

      <div class="eventTop">

        <div class="time">
          ${escapeHtml(event.time)}
        </div>

        <span class="badge">
          ${escapeHtml(event.category)}
        </span>

      </div>


      <h3>
        ${escapeHtml(event.title)}
      </h3>


      ${
        event.description
          ? `
            <div class="meta">
              <strong>Descrizione:</strong>
              ${escapeHtml(event.description)}
            </div>
          `
          : ""
      }


      ${
        event.notes
          ? `
            <div class="meta">
              <strong>Note:</strong>
              ${escapeHtml(event.notes)}
            </div>
          `
          : ""
      }


      <div class="meta">

        🔔 ${reminderText(event.reminder)}

        ·

        ${
          event.reminderType === "alarm"
            ? "⏰ Allarme"
            : "🔔 Notifica Push"
        }

      </div>


      <div class="eventActions">

        <button
          type="button"
          class="editEventBtn"
          data-id="${event.id}">
          ✏️ Modifica
        </button>

        <button
          type="button"
          class="deleteEventBtn"
          data-id="${event.id}">
          🗑️ Elimina
        </button>

      </div>

    </article>

  `).join("");

  return list.length;

}


/* =========================================================
   OGGI
   ========================================================= */

function renderToday() {

  const count =
    renderEventList(
      $("todayList"),
      iso(today)
    );

  $("eventCount").textContent = count;

  $("taskCount").textContent = "0";

}


/* =========================================================
   SETTIMANALE
   ========================================================= */

function renderWeek() {

  const start = startOfWeek(today);

  const days = [];

  for (let i = 0; i < 7; i++) {

    const d = new Date(start);

    d.setDate(start.getDate() + i);

    days.push(d);

  }


  const end = days[6];

  $("weekLabel").textContent =
    `${start.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long"
    })} – ${end.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}`;


  $("weekPicker").innerHTML = days.map(day => {

    const date = iso(day);

    const list = eventMap(date);

    const selected =
      date === selectedWeekDate;

    const isToday =
      date === iso(today);

    const weekday =
      day.toLocaleDateString(
        "it-IT",
        { weekday: "short" }
      ).replace(".", "");

    const month =
      day.toLocaleDateString(
        "it-IT",
        { month: "short" }
      ).replace(".", "");


    return `

      <button
        type="button"
        class="dayChoice ${
          selected ? "selected" : ""
        } ${
          isToday ? "today" : ""
        }"
        data-week-date="${date}">

        <div class="dow">
          ${weekday}
        </div>

        <div class="num">
          ${day.getDate()}
        </div>

        <div class="mon">
          ${month}
        </div>

        ${
          list.length
            ? `
              <div class="eventDots">
                ${list.slice(0, 3).map(() =>
                  `<span class="eventDot"></span>`
                ).join("")}
              </div>
            `
            : ""
        }

      </button>

    `;

  }).join("");


  const selectedDate =
    new Date(
      `${selectedWeekDate}T12:00:00`
    );


  $("weekSelectedLabel").textContent =
    selectedDate.toLocaleDateString(
      "it-IT",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  renderEventList(
    $("weekDayList"),
    selectedWeekDate
  );


  const selectedButton =
    document.querySelector(
      `.dayChoice[data-week-date="${selectedWeekDate}"]`
    );


  if (selectedButton) {

    selectedButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });

  }

}


/* =========================================================
   CALENDARIO MENSILE
   ========================================================= */

function renderInteractiveMonth() {

  const first =
    startOfMonth(monthCursor);

  $("monthTitle").textContent =
    first.toLocaleDateString(
      "it-IT",
      {
        month: "long",
        year: "numeric"
      }
    );


  const gridStart =
    startOfWeek(first);

  const cells = [];

  for (let i = 0; i < 42; i++) {

    const d = new Date(gridStart);

    d.setDate(gridStart.getDate() + i);

    cells.push(d);

  }


  const weekdays = [
    "Lun",
    "Mar",
    "Mer",
    "Gio",
    "Ven",
    "Sab",
    "Dom"
  ];


  const headers =
    weekdays.map(day =>
      `<div class="calendarWeekday">${day}</div>`
    ).join("");


  const body =
    cells.map(day => {

      const date = iso(day);

      const list =
        eventMap(date);

      const other =
        day.getMonth() !== first.getMonth();

      const selected =
        date === selectedMonthDate;

      const isToday =
        date === iso(today);


      return `

        <button
          type="button"
          class="calendarDay ${
            other ? "other" : ""
          } ${
            selected ? "selected" : ""
          } ${
            isToday ? "today" : ""
          }"
          data-month-date="${date}">

          <div class="calendarDayNumber">
            ${day.getDate()}
          </div>

          <div class="calendarEvents">

            ${
              list.slice(0, 3).map(event =>
                `
                  <div
                    class="calendarEventLine ${escapeHtml(event.category)}">
                    ${escapeHtml(event.time)}
                    ${escapeHtml(event.title)}
                  </div>
                `
              ).join("")
            }

            ${
              list.length > 3
                ? `<div class="meta">+${list.length - 3} altri</div>`
                : ""
            }

          </div>

        </button>

      `;

    }).join("");


  $("monthGrid").innerHTML =
    headers + body;


  const selected =
    new Date(
      `${selectedMonthDate}T12:00:00`
    );


  $("monthSelectedLabel").textContent =
    selected.toLocaleDateString(
      "it-IT",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  renderEventList(
    $("monthDayList"),
    selectedMonthDate
  );

}


/* =========================================================
   CALENDARIO
   ========================================================= */

function renderCalendar() {

  const first =
    startOfMonth(calendarCursor);


  $("calendarTitle").textContent =
    first.toLocaleDateString(
      "it-IT",
      {
        month: "long",
        year: "numeric"
      }
    );


  const gridStart =
    startOfWeek(first);

  const cells = [];

  for (let i = 0; i < 42; i++) {

    const d = new Date(gridStart);

    d.setDate(gridStart.getDate() + i);

    cells.push(d);

  }


  const weekdays = [
    "Lun",
    "Mar",
    "Mer",
    "Gio",
    "Ven",
    "Sab",
    "Dom"
  ];


  const headers =
    weekdays.map(day =>
      `<div class="calendarWeekday">${day}</div>`
    ).join("");


  const body =
    cells.map(day => {

      const date = iso(day);

      const list =
        eventMap(date);

      const other =
        day.getMonth() !== first.getMonth();

      const selected =
        date === selectedCalendarDate;

      const isToday =
        date === iso(today);


      return `

        <button
          type="button"
          class="calendarDay ${
            other ? "other" : ""
          } ${
            selected ? "selected" : ""
          } ${
            isToday ? "today" : ""
          }"
          data-calendar-date="${date}">

          <div class="calendarDayNumber">
            ${day.getDate()}
          </div>

          <div class="calendarEvents">

            ${
              list.slice(0, 3).map(event =>
                `
                  <div
                    class="calendarEventLine ${escapeHtml(event.category)}">
                    ${escapeHtml(event.time)}
                    ${escapeHtml(event.title)}
                  </div>
                `
              ).join("")
            }

            ${
              list.length > 3
                ? `<div class="meta">+${list.length - 3} altri</div>`
                : ""
            }

          </div>

        </button>

      `;

    }).join("");


  $("calendarGrid").innerHTML =
    headers + body;


  const selected =
    new Date(
      `${selectedCalendarDate}T12:00:00`
    );


  $("calendarSelectedLabel").textContent =
    selected.toLocaleDateString(
      "it-IT",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  renderEventList(
    $("dateList"),
    selectedCalendarDate
  );

}


/* =========================================================
   RENDER COMPLETO
   ========================================================= */

function renderAll() {

  renderToday();

  renderWeek();

  renderInteractiveMonth();

  renderCalendar();

}


/* =========================================================
   CAMBIO SEZIONE
   ========================================================= */

document.querySelectorAll(".tab").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".tab")
      .forEach(tab =>
        tab.classList.remove("active")
      );


    document.querySelectorAll(".view")
      .forEach(view =>
        view.classList.remove("active")
      );


    button.classList.add("active");

    const view =
      $(button.dataset.view);

    if (view) {

      view.classList.add("active");

    }

    /*
      Ridisegniamo la vista quando viene aperta.
      Questo evita che rimanga vuota dopo il caricamento.
    */

    if (button.dataset.view === "todayView") {

      renderToday();

    }

    if (button.dataset.view === "weekView") {

      renderWeek();

    }

    if (button.dataset.view === "monthView") {

      renderInteractiveMonth();

    }

    if (button.dataset.view === "calendarView") {

      renderCalendar();

    }

  });

});


/* =========================================================
   SETTIMANALE - SELEZIONE GIORNO
   ========================================================= */

$("weekPicker").addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(".dayChoice");

    if (!button) return;

    selectedWeekDate =
      button.dataset.weekDate;

    renderWeek();

  }
);


$("weekTodayBtn").addEventListener(
  "click",
  () => {

    selectedWeekDate =
      iso(today);

    renderWeek();

  }
);


/* =========================================================
   MENSILE - SELEZIONE GIORNO
   ========================================================= */

$("monthGrid").addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(".calendarDay");

    if (!button) return;

    selectedMonthDate =
      button.dataset.monthDate;

    const selected =
      new Date(
        `${selectedMonthDate}T12:00:00`
      );

    monthCursor =
      new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1
      );

    renderInteractiveMonth();

  }
);


$("monthPrevBtn").addEventListener(
  "click",
  () => {

    monthCursor =
      new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() - 1,
        1
      );

    renderInteractiveMonth();

  }
);


$("monthNextBtn").addEventListener(
  "click",
  () => {

    monthCursor =
      new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        1
      );

    renderInteractiveMonth();

  }
);


$("monthTodayBtn").addEventListener(
  "click",
  () => {

    monthCursor =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    selectedMonthDate =
      iso(today);

    renderInteractiveMonth();

  }
);


/* =========================================================
   CALENDARIO - SELEZIONE GIORNO
   ========================================================= */

$("calendarGrid").addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(".calendarDay");

    if (!button) return;

    selectedCalendarDate =
      button.dataset.calendarDate;

    const selected =
      new Date(
        `${selectedCalendarDate}T12:00:00`
      );

    calendarCursor =
      new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1
      );

    renderCalendar();

  }
);


$("prevMonthBtn").addEventListener(
  "click",
  () => {

    calendarCursor =
      new Date(
        calendarCursor.getFullYear(),
        calendarCursor.getMonth() - 1,
        1
      );

    renderCalendar();

  }
);


$("nextMonthBtn").addEventListener(
  "click",
  () => {

    calendarCursor =
      new Date(
        calendarCursor.getFullYear(),
        calendarCursor.getMonth() + 1,
        1
      );

    renderCalendar();

  }
);


$("calendarTodayBtn").addEventListener(
  "click",
  () => {

    calendarCursor =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    selectedCalendarDate =
      iso(today);

    renderCalendar();

  }
);


/* =========================================================
   NUOVO IMPEGNO
   ========================================================= */

function openNewEvent() {

  editingEventId = null;

  $("eventForm").reset();

  $("date").value =
    iso(today);

  $("reminder").value = "30";

  $("reminderType").value =
    "notification";

  $("modalTitle").textContent =
    "Nuovo impegno";

  $("saveEventBtn").textContent =
    "Salva impegno";

  $("modal").classList.remove("hidden");

}


/* =========================================================
   MODIFICA
   ========================================================= */

function openEditEvent(id) {

  const event =
    events.find(
      item => String(item.id) === String(id)
    );

  if (!event) return;

  editingEventId =
    event.id;


  $("title").value =
    event.title || "";

  $("description").value =
    event.description || "";

  $("date").value =
    event.date || iso(today);

  $("time").value =
    event.time || "";

  $("category").value =
    event.category || "Personale";

  $("reminder").value =
    event.reminder ?? "30";

  $("reminderType").value =
    event.reminderType || "notification";

  $("notes").value =
    event.notes || "";


  $("modalTitle").textContent =
    "Modifica impegno";

  $("saveEventBtn").textContent =
    "Salva modifiche";


  $("modal").classList.remove("hidden");

}


/* =========================================================
   ELIMINAZIONE
   ========================================================= */

function deleteEvent(id) {

  const event =
    events.find(
      item => String(item.id) === String(id)
    );

  if (!event) return;


  const confirmed =
    confirm(
      `Vuoi eliminare l'attività "${event.title}"?`
    );


  if (!confirmed) return;


  if (reminderTimers.has(event.id)) {

    clearTimeout(
      reminderTimers.get(event.id)
    );

    reminderTimers.delete(event.id);

  }


  if (activeAlarmId === event.id) {

    stopAlarm();

  }


  events =
    events.filter(
      item => String(item.id) !== String(id)
    );


  saveEvents();

  renderAll();

}


/* =========================================================
   APERTURA MODALE
   ========================================================= */

$("addBtn").addEventListener(
  "click",
  async () => {

    await requestNotificationPermission();

    openNewEvent();

  }
);


$("closeBtn").addEventListener(
  "click",
  () => {

    editingEventId = null;

    $("modal").classList.add("hidden");

  }
);


$("modal").addEventListener(
  "click",
  event => {

    if (event.target.id === "modal") {

      editingEventId = null;

      $("modal").classList.add("hidden");

    }

  }
);


/* =========================================================
   SALVATAGGIO IMPEGNO
   ========================================================= */

$("eventForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const eventData = {

      title:
        $("title").value.trim(),

      description:
        $("description").value.trim(),

      date:
        $("date").value,

      time:
        $("time").value,

      category:
        $("category").value,

      reminder:
        $("reminder").value,

      reminderType:
        $("reminderType").value,

      notes:
        $("notes").value.trim()

    };


    if (
      eventData.reminderType ===
      "notification"
    ) {

      await requestNotificationPermission();

    }


    /* MODIFICA */

    if (editingEventId !== null) {

      const index =
        events.findIndex(
          item =>
            String(item.id) ===
            String(editingEventId)
        );


      if (index !== -1) {

        if (
          reminderTimers.has(
            events[index].id
          )
        ) {

          clearTimeout(
            reminderTimers.get(
              events[index].id
            )
          );

          reminderTimers.delete(
            events[index].id
          );

        }


        events[index] = {

          ...events[index],

          ...eventData

        };


        saveEvents();

        scheduleReminder(
          events[index]
        );

      }

    }


    /* NUOVO */

    else {

      const newEvent = {

        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,

        ...eventData

      };


      events.push(newEvent);

      saveEvents();

      scheduleReminder(newEvent);

    }


    editingEventId = null;


    $("eventForm").reset();

    $("date").value =
      iso(today);

    $("reminder").value =
      "30";

    $("reminderType").value =
      "notification";

    $("modalTitle").textContent =
      "Nuovo impegno";

    $("saveEventBtn").textContent =
      "Salva impegno";

    $("modal").classList.add("hidden");


    renderAll();

  }
);


/* =========================================================
   MODIFICA / ELIMINA
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const edit =
      event.target.closest(
        ".editEventBtn"
      );

    if (edit) {

      event.preventDefault();

      openEditEvent(
        edit.dataset.id
      );

      return;

    }


    const remove =
      event.target.closest(
        ".deleteEventBtn"
      );

    if (remove) {

      event.preventDefault();

      deleteEvent(
        remove.dataset.id
      );

    }

  }
);


/* =========================================================
   NOTIFICHE
   ========================================================= */

async function requestNotificationPermission() {

  if (
    !("Notification" in window)
  ) {

    return false;

  }


  if (
    Notification.permission ===
    "granted"
  ) {

    return true;

  }


  if (
    Notification.permission ===
    "denied"
  ) {

    return false;

  }


  try {

    return (
      await Notification.requestPermission()
    ) === "granted";

  } catch {

    return false;

  }

}


/* =========================================================
   PUSH - PREPARAZIONE
   ========================================================= */

/*
  IMPORTANTE:

  La vera sottoscrizione Push richiederà la chiave
  pubblica VAPID del nostro server.

  Per ora lasciamo il valore vuoto.

  Quando creeremo il backend inseriremo qui
  la chiave pubblica.
*/

const VAPID_PUBLIC_KEY = "";


function urlBase64ToUint8Array(base64String) {

  const padding =
    "=".repeat(
      (4 - base64String.length % 4) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      char => char.charCodeAt(0)
    )
  );

}


async function enablePushNotifications() {

  const status =
    $("pushStatus");

  const button =
    $("enablePushBtn");


  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {

    status.textContent =
      "Il tuo browser non supporta le notifiche Push.";

    return false;

  }


  if (!VAPID_PUBLIC_KEY) {

    status.textContent =
      "Le notifiche Push saranno attivate dopo il collegamento al server.";

    return false;

  }


  const permission =
    await requestNotificationPermission();


  if (!permission) {

    status.textContent =
      "Permesso notifiche non concesso.";

    return false;

  }


  try {

    button.disabled = true;

    button.textContent =
      "Attivazione...";


    const registration =
      await navigator.serviceWorker.ready;


    let subscription =
      await registration.pushManager.getSubscription();


    if (!subscription) {

      subscription =
        await registration.pushManager.subscribe({

          userVisibleOnly: true,

          applicationServerKey:
            urlBase64ToUint8Array(
              VAPID_PUBLIC_KEY
            )

        });

    }


    /*
      Nel prossimo passaggio questa subscription
      verrà inviata al nostro server.
    */

    localStorage.setItem(
      "agenda_push_subscription",
      JSON.stringify(subscription)
    );


    status.textContent =
      "Notifiche Push abilitate su questo dispositivo.";

    button.textContent =
      "✓ Notifiche abilitate";


    return true;

  } catch (error) {

    console.error(
      "Errore Push:",
      error
    );

    status.textContent =
      "Impossibile attivare le notifiche Push.";

    button.disabled = false;

    button.textContent =
      "Abilita notifiche Push";

    return false;

  }

}


$("enablePushBtn").addEventListener(
  "click",
  enablePushNotifications
);


/* =========================================================
   PROMEMORIA LOCALI
   ========================================================= */

function reminderAt(event) {

  if (!event.time || !event.date) {
    return 0;
  }


  const [
    hours,
    minutes
  ] =
    event.time
      .split(":")
      .map(Number);


  const date =
    new Date(
      Number(event.date.slice(0, 4)),
      Number(event.date.slice(5, 7)) - 1,
      Number(event.date.slice(8, 10)),
      hours,
      minutes,
      0,
      0
    );


  return (
    date.getTime() -
    Number(event.reminder || 0) *
      60000
  );

}


function scheduleReminder(event) {

  if (
    reminderTimers.has(event.id)
  ) {

    clearTimeout(
      reminderTimers.get(event.id)
    );

    reminderTimers.delete(
      event.id
    );

  }


  /*
    Il timer locale rimane come fallback.

    Il Push vero verrà gestito dal server
    quando completeremo la configurazione.
  */

  const when =
    reminderAt(event);

  const delay =
    when - Date.now();


  if (delay <= 0) {
    return;
  }


  /*
    setTimeout ha un limite:
    funziona bene con la PWA attiva,
    ma NON è sufficiente per garantire
    il promemoria con app completamente chiusa.

    Per questo stiamo aggiungendo il Push.
  */

  const timer =
    setTimeout(
      () => fireReminder(event),
      delay
    );


  reminderTimers.set(
    event.id,
    timer
  );

}


function scheduleAllReminders() {

  reminderTimers.forEach(
    timer => clearTimeout(timer)
  );

  reminderTimers.clear();


  events.forEach(
    scheduleReminder
  );

}


/* =========================================================
   PROMEMORIA LOCALE
   ========================================================= */

async function fireReminder(event) {

  if (
    event.reminderType ===
    "alarm"
  ) {

    startAlarm(event);

    return;

  }


  const granted =
    await requestNotificationPermission();


  if (!granted) {

    showInAppMessage(event);

    return;

  }


  try {

    const registration =
      await navigator.serviceWorker.ready;


    await registration.showNotification(
      "Agenda Personale",
      {

        body:
          `${event.title}\n${event.time} · ${event.category}`,

        icon:
          "./icons/icon-192.png",

        badge:
          "./icons/icon-192.png",

        tag:
          `agenda-${event.id}`,

        requireInteraction:
          true,

        data:
          {
            eventId:
              event.id
          }

      }
    );


  } catch (error) {

    console.error(
      "Errore notifica:",
      error
    );

    showInAppMessage(event);

  }

}


function showInAppMessage(event) {

  startAlarm(
    event,
    true
  );

}


/* =========================================================
   ALLARME
   ========================================================= */

function startAlarm(
  event,
  notificationFallback = false
) {

  stopAlarm();


  activeAlarmId =
    event.id;


  $("alarmTitle").textContent =
    event.title;


  $("alarmInfo").textContent =
    `${event.date} · ${event.time}${
      notificationFallback
        ? " · notifiche non disponibili"
        : " · allarme"
    }`;


  $("alarmModal")
    .classList
    .remove("hidden");


  try {

    alarmAudio =
      new Audio(
        "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////"
      );


    alarmAudio.loop =
      true;

    alarmAudio.volume =
      0.95;


    alarmAudio
      .play()
      .catch(() => {});


  } catch {}

}


function stopAlarm() {

  if (alarmAudio) {

    alarmAudio.pause();

    alarmAudio.currentTime =
      0;

    alarmAudio =
      null;

  }


  $("alarmModal")
    .classList
    .add("hidden");


  activeAlarmId =
    null;

}


$("stopAlarmBtn").addEventListener(
  "click",
  stopAlarm
);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

async function registerServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {

    return null;

  }


  try {

    const registration =
      await navigator.serviceWorker.register(
        "./sw.js"
      );


    await navigator.serviceWorker.ready;

    return registration;

  } catch (error) {

    console.error(
      "Service Worker:",
      error
    );

    return null;

  }

}


/* =========================================================
   VISIBILITÀ
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (!document.hidden) {

      /*
        Ricarichiamo sempre i dati dal localStorage.
        Questo evita che la memoria JavaScript
        rimanga diversa da quella persistente.
      */

      loadEvents();

      renderAll();

      scheduleAllReminders();

    }

  }
);


window.addEventListener(
  "focus",
  () => {

    loadEvents();

    renderAll();

    scheduleAllReminders();

  }
);


/* =========================================================
   AVVIO APP
   ========================================================= */

async function initApp() {

  loadEvents();


  $("today").textContent =
    today.toLocaleDateString(
      "it-IT",
      {
        weekday: "long",
        day: "numeric",
        month: "long"
      }
    );


  $("date").value =
    iso(today);


  renderAll();

  scheduleAllReminders();

  await registerServiceWorker();

}


/* Avvio */

initApp();
