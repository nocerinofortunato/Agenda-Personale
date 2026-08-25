const $=id=>document.getElementById(id);

const today=new Date();

const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const key="agenda_personale_events";

/* =========================================================
   CONFIGURAZIONE PUSH
   ========================================================= */

const PUSH_SERVER="https://agend-personale-push.nocerinofortunato.workers.dev";

const VAPID_PUBLIC_KEY=
"BLOwbUy7IFTJmnYhfkM_QXJJgA5LdX25sO7kXOgHMOPdYH4TUhBoWCq2eT9JyJUxhcY6pwhm92QTT4eK8YPC7Zo";

let serviceWorkerRegistration=null;
let pushSubscription=null;

/* =========================================================
   DATI AGENDA
   ========================================================= */

let events=JSON.parse(localStorage.getItem(key)||"[]");

const reminderTimers=new Map();

let alarmAudio=null;
let activeAlarmId=null;
let editingEventId=null;

let selectedWeekDate=iso(today);

let calendarCursor=new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let selectedCalendarDate=iso(today);

let selectedMonthDate=iso(today);

/* =========================================================
   INIZIALIZZAZIONE
   ========================================================= */

$("today").textContent=today.toLocaleDateString(
  "it-IT",
  {
    weekday:"long",
    day:"numeric",
    month:"long"
  }
);

$("date").value=iso(today);

$("calendarDate")?.remove();

/* =========================================================
   STORAGE
   ========================================================= */

function save(){
  localStorage.setItem(
    key,
    JSON.stringify(events)
  );
}

/* =========================================================
   SICUREZZA HTML
   ========================================================= */

function escapeHtml(s){
  return String(s).replace(
    /[&<>"']/g,
    c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c])
  );
}

/* =========================================================
   REMINDER
   ========================================================= */

function reminderText(v){
  return v==="0"
    ?"all'orario"
    :v==="10"
    ?"10 min prima"
    :v==="30"
    ?"30 min prima"
    :v==="60"
    ?"1 ora prima"
    :"1 giorno prima";
}

function eventMap(dateStr){
  return events
    .filter(e=>e.date===dateStr)
    .sort(
      (a,b)=>
        (a.time||"").localeCompare(b.time||"")
    );
}

/* =========================================================
   RENDER EVENTI
   ========================================================= */

function render(listEl,date){

  const arr=eventMap(date);

  listEl.innerHTML=arr.length
    ?arr.map(e=>`
      <article class="event ${e.category}">

        <div class="eventTop">
          <div class="time">${e.time}</div>
          <span class="badge">${e.category}</span>
        </div>

        <h3>${escapeHtml(e.title)}</h3>

        ${e.description?`
          <div class="meta">
            <strong>Descrizione:</strong>
            ${escapeHtml(e.description)}
          </div>
        `:""}

        ${e.notes?`
          <div class="meta">
            <strong>Note:</strong>
            ${escapeHtml(e.notes)}
          </div>
        `:""}

        <div class="meta">
          🔔 ${reminderText(e.reminder)}
          ·
          ${e.reminderType==="alarm"
            ?"⏰ Allarme"
            :"Notifica"}
        </div>

        <div class="eventActions">

          <button
            type="button"
            class="editEventBtn"
            data-id="${e.id}"
          >
            ✏️ Modifica
          </button>

          <button
            type="button"
            class="deleteEventBtn"
            data-id="${e.id}"
          >
            🗑️ Elimina
          </button>

        </div>

      </article>
    `).join("")
    :`
      <div class="empty">
        Nessun impegno per questa giornata.
      </div>
    `;

  return arr.length;
}

/* =========================================================
   DATE
   ========================================================= */

function startOfWeek(d){

  const x=new Date(d);

  const day=(x.getDay()+6)%7;

  x.setDate(x.getDate()-day);

  x.setHours(0,0,0,0);

  return x;
}

function startOfMonth(d){
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    1
  );
}

/* =========================================================
   OGGI
   ========================================================= */

function renderToday(){

  const n=render(
    $("todayList"),
    iso(today)
  );

  $("eventCount").textContent=n;

  $("taskCount").textContent="0";
}

/* =========================================================
   SETTIMANA
   ========================================================= */

function renderWeek(){

  const start=startOfWeek(today);

  const days=[];

  for(let i=0;i<7;i++){

    const d=new Date(start);

    d.setDate(
      start.getDate()+i
    );

    days.push(d);
  }

  const end=days[6];

  $("weekLabel").textContent=
    `${start.toLocaleDateString(
      "it-IT",
      {
        day:"numeric",
        month:"long"
      }
    )} – ${end.toLocaleDateString(
      "it-IT",
      {
        day:"numeric",
        month:"long",
        year:"numeric"
      }
    )}`;

  $("weekPicker").innerHTML=days.map(d=>{

    const ds=iso(d);

    const arr=eventMap(ds);

    const selected=
      ds===selectedWeekDate;

    const isToday=
      ds===iso(today);

    const dow=
      d.toLocaleDateString(
        "it-IT",
        {weekday:"short"}
      ).replace(".","");

    const mon=
      d.toLocaleDateString(
        "it-IT",
        {month:"short"}
      ).replace(".","");

    return `
      <button
        type="button"
        class="dayChoice ${
          selected?"selected":""
        } ${
          isToday?"today":""
        }"
        data-week-date="${ds}"
      >

        <div class="dow">${dow}</div>

        <div class="num">${d.getDate()}</div>

        <div class="mon">${mon}</div>

        ${
          arr.length
          ?`
            <div class="eventDots">
              ${arr
                .slice(0,3)
                .map(e=>
                  `<span class="eventDot ${e.category}"></span>`
                )
                .join("")
              }
            </div>
          `
          :""
        }

      </button>
    `;

  }).join("");

  const selectedDate=
    new Date(
      selectedWeekDate+"T12:00:00"
    );

  $("weekSelectedLabel").textContent=
    selectedDate.toLocaleDateString(
      "it-IT",
      {
        weekday:"long",
        day:"numeric",
        month:"long",
        year:"numeric"
      }
    );

  render(
    $("weekDayList"),
    selectedWeekDate
  );
}

/* =========================================================
   MENSILE
   ========================================================= */

function renderMonth(){

  const first=startOfMonth(today);

  const gridStart=startOfWeek(first);

  const cells=[];

  for(let i=0;i<42;i++){

    const d=new Date(gridStart);

    d.setDate(
      gridStart.getDate()+i
    );

    cells.push(d);
  }

  $("monthLabel").textContent=
    first.toLocaleDateString(
      "it-IT",
      {
        month:"long",
        year:"numeric"
      }
    );

  const heads=[
    "Lun",
    "Mar",
    "Mer",
    "Gio",
    "Ven",
    "Sab",
    "Dom"
  ]
  .map(
    x=>`<div class="weekdayHead">${x}</div>`
  )
  .join("");

  const body=cells.map(d=>{

    const ds=iso(d);

    const arr=eventMap(ds);

    const other=
      d.getMonth()!==first.getMonth();

    const isToday=
      ds===iso(today);

    const selected=
      ds===selectedMonthDate;

    return `
      <button
        type="button"
        class="monthCell ${
          other?"other":""
        } ${
          isToday?"today":""
        } ${
          selected?"selected":""
        }"
        data-month-date="${ds}"
      >

        <div class="monthNumber">
          ${d.getDate()}
        </div>

        ${
          arr
          .slice(0,4)
          .map(e=>
            `
              <div class="monthEvent ${e.category}">
                <span>
                  ${e.time}
                  ${escapeHtml(e.title)}
                </span>
              </div>
            `
          )
          .join("")
        }

        ${
          arr.length>4
          ?`
            <div class="meta">
              +${arr.length-4} altri
            </div>
          `
          :""
        }

      </button>
    `;

  }).join("");

  $("monthList").innerHTML=
    heads+body;

  renderMonthSelected();
}

function renderMonthSelected(){

  let box=$("monthSelectedBox");

  if(!box){

    box=document.createElement("div");

    box.id="monthSelectedBox";
    box.className="selectedDayTitle";

    $("monthList")
      .insertAdjacentElement(
        "afterend",
        box
      );
  }

  const date=
    new Date(
      selectedMonthDate+"T12:00:00"
    );

  box.innerHTML=`
    <h3>
      ${date.toLocaleDateString(
        "it-IT",
        {
          weekday:"long",
          day:"numeric",
          month:"long",
          year:"numeric"
        }
      )}
    </h3>

    <p class="muted">
      Impegni del giorno selezionato
    </p>

    <div id="monthDayList" class="list"></div>
  `;

  render(
    $("monthDayList"),
    selectedMonthDate
  );
}

/* =========================================================
   CALENDARIO
   ========================================================= */

function renderCalendar(){

  const first=
    startOfMonth(calendarCursor);

  $("calendarTitle").textContent=
    first.toLocaleDateString(
      "it-IT",
      {
        month:"long",
        year:"numeric"
      }
    );

  const gridStart=
    startOfWeek(first);

  const cells=[];

  for(let i=0;i<42;i++){

    const d=new Date(gridStart);

    d.setDate(
      gridStart.getDate()+i
    );

    cells.push(d);
  }

  const heads=[
    "Lun",
    "Mar",
    "Mer",
    "Gio",
    "Ven",
    "Sab",
    "Dom"
  ]
  .map(
    x=>`
      <div class="calendarWeekday">
        ${x}
      </div>
    `
  )
  .join("");

  const body=cells.map(d=>{

    const ds=iso(d);

    const arr=eventMap(ds);

    const other=
      d.getMonth()!==first.getMonth();

    const selected=
      ds===selectedCalendarDate;

    const isToday=
      ds===iso(today);

    return `
      <button
        type="button"
        class="calendarDay ${
          other?"other":""
        } ${
          selected?"selected":""
        } ${
          isToday?"today":""
        }"
        data-calendar-date="${ds}"
      >

        <div class="calendarDayNumber">
          ${d.getDate()}
        </div>

        <div class="calendarEvents">

          ${
            arr
            .slice(0,3)
            .map(e=>
              `
                <div
                  class="calendarEventLine ${e.category}"
                >
                  ${e.time}
                  ${escapeHtml(e.title)}
                </div>
              `
            )
            .join("")
          }

          ${
            arr.length>3
            ?`
              <div class="meta">
                +${arr.length-3}
              </div>
            `
            :""
          }

        </div>

      </button>
    `;

  }).join("");

  $("calendarGrid").innerHTML=
    heads+body;

  const selectedDate=
    new Date(
      selectedCalendarDate+"T12:00:00"
    );

  $("calendarSelectedLabel").textContent=
    selectedDate.toLocaleDateString(
      "it-IT",
      {
        weekday:"long",
        day:"numeric",
        month:"long",
        year:"numeric"
      }
    );

  render(
    $("dateList"),
    selectedCalendarDate
  );
}

/* =========================================================
   RENDER COMPLETO
   ========================================================= */

function renderAll(){

  renderToday();

  renderWeek();

  renderMonth();

  renderCalendar();
}

/* =========================================================
   TABS
   ========================================================= */

document
  .querySelectorAll(".tab")
  .forEach(btn=>{

    btn.onclick=()=>{

      document
        .querySelectorAll(".tab")
        .forEach(x=>
          x.classList.remove("active")
        );

      document
        .querySelectorAll(".view")
        .forEach(x=>
          x.classList.remove("active")
        );

      btn.classList.add("active");

      $(btn.dataset.view)
        .classList.add("active");
    };

  });

/* =========================================================
   SETTIMANA CLICK
   ========================================================= */

$("weekPicker").addEventListener(
  "click",
  e=>{

    const btn=
      e.target.closest(".dayChoice");

    if(!btn)return;

    selectedWeekDate=
      btn.dataset.weekDate;

    renderWeek();
  }
);

$("weekTodayBtn").onclick=()=>{

  selectedWeekDate=
    iso(today);

  renderWeek();
};

/* =========================================================
   MENSILE CLICK
   ========================================================= */

$("monthList").addEventListener(
  "click",
  e=>{

    const btn=
      e.target.closest(".monthCell");

    if(!btn)return;

    selectedMonthDate=
      btn.dataset.monthDate;

    renderMonth();
  }
);

/* =========================================================
   CALENDARIO CLICK
   ========================================================= */

$("calendarGrid").addEventListener(
  "click",
  e=>{

    const btn=
      e.target.closest(".calendarDay");

    if(!btn)return;

    selectedCalendarDate=
      btn.dataset.calendarDate;

    const d=
      new Date(
        selectedCalendarDate+
        "T12:00:00"
      );

    calendarCursor=
      new Date(
        d.getFullYear(),
        d.getMonth(),
        1
      );

    renderCalendar();
  }
);

$("prevMonthBtn").onclick=()=>{

  calendarCursor=
    new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth()-1,
      1
    );

  renderCalendar();
};

$("nextMonthBtn").onclick=()=>{

  calendarCursor=
    new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth()+1,
      1
    );

  renderCalendar();
};

$("calendarTodayBtn").onclick=()=>{

  calendarCursor=
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  selectedCalendarDate=
    iso(today);

  renderCalendar();
};

/* =========================================================
   SERVICE WORKER
   ========================================================= */

async function getServiceWorker(){

  if(!("serviceWorker" in navigator)){

    console.warn(
      "Service Worker non supportato."
    );

    return null;
  }

  try{

    if(!serviceWorkerRegistration){

      serviceWorkerRegistration=
        await navigator.serviceWorker.register(
          "./sw.js"
        );
    }

    await navigator.serviceWorker.ready;

    serviceWorkerRegistration=
      await navigator.serviceWorker.ready;

    return serviceWorkerRegistration;

  }catch(error){

    console.error(
      "Errore Service Worker:",
      error
    );

    return null;
  }
}

/* =========================================================
   VAPID
   ========================================================= */

function urlBase64ToUint8Array(base64String){

  const padding=
    "=".repeat(
      (4-(base64String.length%4))%4
    );

  const base64=
    (
      base64String+
      padding
    )
    .replace(/-/g,"+")
    .replace(/_/g,"/");

  const rawData=
    window.atob(base64);

  const outputArray=
    new Uint8Array(
      rawData.length
    );

  for(
    let i=0;
    i<rawData.length;
    ++i
  ){

    outputArray[i]=
      rawData.charCodeAt(i);
  }

  return outputArray;
}

/* =========================================================
   SUBSCRIPTION
   ========================================================= */

async function sendSubscriptionToServer(
  subscription
){

  try{

    const response=
      await fetch(
        `${PUSH_SERVER}/subscribe`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({
            subscription:
              subscription.toJSON
              ?subscription.toJSON()
              :subscription
          })
        }
      );

    if(!response.ok){

      throw new Error(
        `Server push HTTP ${response.status}`
      );
    }

    console.log(
      "Subscription Push registrata su Cloudflare."
    );

    return true;

  }catch(error){

    console.warn(
      "Cloudflare Push non ancora disponibile:",
      error
    );

    return false;
  }
}

/* =========================================================
   PUSH
   ========================================================= */

async function enablePushNotifications(){

  if(
    !("Notification" in window) ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator)
  ){

    console.warn(
      "Push Web non supportato."
    );

    return false;
  }

  try{

    const permission=
      await requestNotificationPermission();

    if(permission!=="granted"){

      console.warn(
        "Permesso notifiche non concesso."
      );

      return false;
    }

    const registration=
      await getServiceWorker();

    if(!registration)return false;

    let subscription=
      await registration.pushManager
        .getSubscription();

    if(!subscription){

      subscription=
        await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:
            urlBase64ToUint8Array(
              VAPID_PUBLIC_KEY
            )
        });
    }

    pushSubscription=
      subscription;

    const sent=
      await sendSubscriptionToServer(
        subscription
      );

    if(sent){

      console.log(
        "🔔 Push Agenda attivo."
      );
    }

    return true;

  }catch(error){

    console.error(
      "Errore attivazione Push:",
      error
    );

    return false;
  }
}

async function requestNotificationPermission(){

  if(!("Notification" in window)){
    return "unsupported";
  }

  if(
    Notification.permission===
    "granted"
  ){
    return "granted";
  }

  if(
    Notification.permission===
    "denied"
  ){
    return "denied";
  }

  try{

    return await Notification.requestPermission();

  }catch{

    return "denied";
  }
}

/* =========================================================
   SCHEDULE PUSH
   ========================================================= */

async function pushScheduleEvent(event){

  try{

    if(!pushSubscription){

      const registration=
        await getServiceWorker();

      if(registration){

        pushSubscription=
          await registration.pushManager
            .getSubscription();
      }
    }

    if(!pushSubscription){
      return false;
    }

    const reminderAt=
      reminderAtTime(event);

    const response=
      await fetch(
        `${PUSH_SERVER}/schedule`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            event:{
              id:event.id,
              title:event.title,
              description:event.description,
              date:event.date,
              time:event.time,
              category:event.category,
              reminder:event.reminder,
              reminderType:event.reminderType,
              notes:event.notes
            },

            reminderAt,

            subscription:
              pushSubscription.toJSON
              ?pushSubscription.toJSON()
              :pushSubscription
          })
        }
      );

    if(!response.ok){

      throw new Error(
        `Schedule HTTP ${response.status}`
      );
    }

    console.log(
      "📅 Promemoria inviato a Cloudflare:",
      event.title
    );

    return true;

  }catch(error){

    console.warn(
      "Programmazione Push non disponibile:",
      error
    );

    return false;
  }
}

async function pushDeleteEvent(eventId){

  try{

    await fetch(
      `${PUSH_SERVER}/schedule/${encodeURIComponent(eventId)}`,
      {
        method:"DELETE"
      }
    );

  }catch(error){

    console.warn(
      "Cancellazione Push non disponibile:",
      error
    );
  }
}

/* =========================================================
   ORA PROMEMORIA
   ========================================================= */

function reminderAtTime(event){

  const [h,m]=
    event.time
      .split(":")
      .map(Number);

  const d=new Date();

  d.setFullYear(
    Number(event.date.slice(0,4)),
    Number(event.date.slice(5,7))-1,
    Number(event.date.slice(8,10))
  );

  d.setHours(
    h,
    m,
    0,
    0
  );

  return (
    d.getTime()-
    Number(event.reminder||0)*
    60000
  );
}

/* =========================================================
   NUOVO EVENTO
   ========================================================= */

function openNewEvent(){

  editingEventId=null;

  $("eventForm").reset();

  $("date").value=
    iso(today);

  $("reminder").value=
    "30";

  $("reminderType").value=
    "notification";

  $("modalTitle").textContent=
    "Nuovo impegno";

  $("saveEventBtn").textContent=
    "Salva impegno";

  $("modal").classList.remove(
    "hidden"
  );
}

/* =========================================================
   MODIFICA
   ========================================================= */

function openEditEvent(id){

  const event=
    events.find(
      e=>String(e.id)===
      String(id)
    );

  if(!event)return;

  editingEventId=
    event.id;

  $("title").value=
    event.title||"";

  $("description").value=
    event.description||"";

  $("date").value=
    event.date||iso(today);

  $("time").value=
    event.time||"";

  $("category").value=
    event.category||"";

  $("reminder").value=
    event.reminder??"30";

  $("reminderType").value=
    event.reminderType||
    "notification";

  $("notes").value=
    event.notes||"";

  $("modalTitle").textContent=
    "Modifica impegno";

  $("saveEventBtn").textContent=
    "Salva modifiche";

  $("modal").classList.remove(
    "hidden"
  );
}

/* =========================================================
   ELIMINA
   ========================================================= */

async function deleteEvent(id){

  const event=
    events.find(
      e=>String(e.id)===
      String(id)
    );

  if(!event)return;

  if(
    !confirm(
      `Vuoi eliminare l'attività "${event.title}"?`
    )
  ){
    return;
  }

  if(
    reminderTimers.has(event.id)
  ){

    clearTimeout(
      reminderTimers.get(event.id)
    );

    reminderTimers.delete(event.id);
  }

  if(
    activeAlarmId===event.id
  ){
    stopAlarm();
  }

  await pushDeleteEvent(
    event.id
  );

  events=
    events.filter(
      e=>String(e.id)!==
      String(id)
    );

  save();

  renderAll();
}

/* =========================================================
   NUOVO
   ========================================================= */

$("addBtn").onclick=async()=>{

  await enablePushNotifications();

  openNewEvent();
};

/* =========================================================
   CHIUDI
   ========================================================= */

$("closeBtn").onclick=()=>{

  editingEventId=null;

  $("modal").classList.add(
    "hidden"
  );
};

$("modal").onclick=e=>{

  if(e.target.id==="modal"){

    editingEventId=null;

    $("modal").classList.add(
      "hidden"
    );
  }
};

/* =========================================================
   SALVATAGGIO
   ========================================================= */

$("eventForm").onsubmit=
  async e=>{

    e.preventDefault();

    const eventData={

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

    if(
      eventData.reminderType===
      "notification"
    ){

      await enablePushNotifications();
    }

    if(
      editingEventId!==null
    ){

      const index=
        events.findIndex(
          x=>
            String(x.id)===
            String(editingEventId)
        );

      if(index!==-1){

        const updatedEvent={
          ...events[index],
          ...eventData
        };

        if(
          reminderTimers.has(
            updatedEvent.id
          )
        ){

          clearTimeout(
            reminderTimers.get(
              updatedEvent.id
            )
          );

          reminderTimers.delete(
            updatedEvent.id
          );
        }

        events[index]=
          updatedEvent;

        save();

        scheduleReminder(
          updatedEvent
        );

        if(
          updatedEvent.reminderType===
          "notification"
        ){

          await pushScheduleEvent(
            updatedEvent
          );
        }
      }

    }else{

      const newEvent={
        id:Date.now(),
        ...eventData
      };

      events.push(
        newEvent
      );

      save();

      scheduleReminder(
        newEvent
      );

      if(
        newEvent.reminderType===
        "notification"
      ){

        await pushScheduleEvent(
          newEvent
        );
      }
    }

    editingEventId=null;

    e.target.reset();

    $("date").value=
      iso(today);

    $("reminder").value=
      "30";

    $("reminderType").value=
      "notification";

    $("modalTitle").textContent=
      "Nuovo impegno";

    $("saveEventBtn").textContent=
      "Salva impegno";

    $("modal").classList.add(
      "hidden"
    );

    renderAll();
  };

/* =========================================================
   TIMER LOCALE
   ========================================================= */

function reminderAt(event){
  return reminderAtTime(event);
}

function scheduleReminder(event){

  if(
    reminderTimers.has(
      event.id
    )
  ){

    clearTimeout(
      reminderTimers.get(
        event.id
      )
    );

    reminderTimers.delete(
      event.id
    );
  }

  const delay=
    reminderAt(event)-
    Date.now();

  if(delay<=0)return;

  const timer=
    setTimeout(
      ()=>fireReminder(event),
      delay
    );

  reminderTimers.set(
    event.id,
    timer
  );
}

function scheduleAllReminders(){

  events.forEach(
    scheduleReminder
  );
}

/* =========================================================
   PROMEMORIA
   ========================================================= */

async function fireReminder(event){

  if(
    event.reminderType===
    "alarm"
  ){

    startAlarm(event);

    return;
  }

  const granted=
    await requestNotificationPermission();

  const text=
    `${event.time} · ${event.category}`;

  if(granted==="granted"){

    try{

      const reg=
        await getServiceWorker();

      await reg.showNotification(
        "Agenda Personale",
        {
          body:
            `${event.title}\n${text}`,

          icon:
            "./icons/icon-192.png",

          badge:
            "./icons/icon-192.png",

          tag:
            `agenda-${event.id}`,

          requireInteraction:
            true,

          data:{
            eventId:event.id
          }
        }
      );

      return;

    }catch(error){

      console.warn(
        "Notifica locale non disponibile:",
        error
      );
    }
  }

  showInAppMessage(
    event
  );
}

function showInAppMessage(event){

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
  notificationFallback=false
){

  stopAlarm();

  activeAlarmId=
    event.id;

  $("alarmTitle").textContent=
    event.title;

  $("alarmInfo").textContent=
    `${event.date} · ${event.time}${
      notificationFallback
      ?" · notifiche non disponibili"
      :" · allarme"
    }`;

  $("alarmModal")
    .classList
    .remove("hidden");

  try{

    alarmAudio=
      new Audio(
        "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////"
      );

    alarmAudio.loop=true;

    alarmAudio.volume=.95;

    alarmAudio.play()
      .catch(()=>{});

  }catch{}
}

function stopAlarm(){

  if(alarmAudio){

    alarmAudio.pause();

    alarmAudio.currentTime=0;

    alarmAudio=null;
  }

  $("alarmModal")
    .classList
    .add("hidden");

  activeAlarmId=null;
}

$("stopAlarmBtn").onclick=
  stopAlarm;

/* =========================================================
   MODIFICA / ELIMINA
   ========================================================= */

document.addEventListener(
  "click",
  e=>{

    const editBtn=
      e.target.closest(
        ".editEventBtn"
      );

    if(editBtn){

      e.preventDefault();

      openEditEvent(
        editBtn.dataset.id
      );

      return;
    }

    const deleteBtn=
      e.target.closest(
        ".deleteEventBtn"
      );

    if(deleteBtn){

      e.preventDefault();

      deleteEvent(
        deleteBtn.dataset.id
      );
    }
  }
);

/* =========================================================
   VISIBILITÀ
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  ()=>{

    if(!document.hidden){

      scheduleAllReminders();
    }
  }
);

window.addEventListener(
  "focus",
  scheduleAllReminders
);

/* =========================================================
   AVVIO
   ========================================================= */

(async()=>{

  await getServiceWorker();

  if(
    "Notification" in window &&
    Notification.permission==="granted"
  ){

    try{

      await enablePushNotifications();

    }catch{}
  }

  scheduleAllReminders();

  renderAll();

})();
