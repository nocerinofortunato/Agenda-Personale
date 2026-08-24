const $=id=>document.getElementById(id);

const today=new Date();

const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const key="agenda_personale_events";

let events=JSON.parse(localStorage.getItem(key)||"[]");

const reminderTimers=new Map();

let alarmAudio=null;
let activeAlarmId=null;
let editingEventId=null;


/* =========================
   INIZIALIZZAZIONE
========================= */

$("today").textContent=today.toLocaleDateString(
  "it-IT",
  {
    weekday:"long",
    day:"numeric",
    month:"long"
  }
);

$("date").value=iso(today);
$("calendarDate").value=iso(today);


/* =========================
   SALVATAGGIO
========================= */

function save(){
  localStorage.setItem(key,JSON.stringify(events));
}


/* =========================
   RENDER ATTIVITÀ
========================= */

function render(listEl,date){

  const arr=events
    .filter(e=>e.date===date)
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""));

  listEl.innerHTML=arr.length
    ?arr.map(e=>`
      <article class="event ${e.category}">

        <div class="eventTop">

          <div class="time">
            ${e.time}
          </div>

          <span class="badge">
            ${e.category}
          </span>

        </div>

        <h3>
          ${escapeHtml(e.title)}
        </h3>

        ${
          e.description
          ?`
            <div class="meta">
              <strong>Descrizione:</strong>
              ${escapeHtml(e.description)}
            </div>
          `
          :""
        }

        ${
          e.notes
          ?`
            <div class="meta">
              <strong>Note:</strong>
              ${escapeHtml(e.notes)}
            </div>
          `
          :""
        }

        <div class="meta">
          🔔 ${reminderText(e.reminder)}
          ·
          ${e.reminderType==="alarm"
            ?"⏰ Allarme"
            :"Notifica"
          }
        </div>

        <div class="eventActions">

          <button
            type="button"
            class="editEventBtn"
            data-id="${e.id}">
            ✏️ Modifica
          </button>

          <button
            type="button"
            class="deleteEventBtn"
            data-id="${e.id}">
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


/* =========================
   TESTI PROMEMORIA
========================= */

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


/* =========================
   SICUREZZA TESTO
========================= */

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


function pad(n){
  return String(n).padStart(2,"0");
}


function localIso(d){
  return iso(d);
}


/* =========================
   SETTIMANA
========================= */

function startOfWeek(d){

  const x=new Date(d);

  const day=(x.getDay()+6)%7;

  x.setDate(x.getDate()-day);

  x.setHours(0,0,0,0);

  return x;
}


/* =========================
   MESE
========================= */

function startOfMonth(d){

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    1
  );
}


/* =========================
   ATTIVITÀ DI UNA DATA
========================= */

function eventMap(dateStr){

  return events
    .filter(e=>e.date===dateStr)
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""));
}


/* =========================
   RENDER SETTIMANA
========================= */

function renderWeek(){

  const start=startOfWeek(today);

  const days=[];

  for(let i=0;i<7;i++){

    const d=new Date(start);

    d.setDate(start.getDate()+i);

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


  $("weekList").innerHTML=days.map(d=>{

    const ds=localIso(d);

    const arr=eventMap(ds);

    const label=d
      .toLocaleDateString(
        "it-IT",
        {
          weekday:"short"
        }
      )
      .replace(".","");


    return `
      <div class="dayColumn">

        <div class="dayHead">

          ${label}

          <div class="dayDate">
            ${d.getDate()}
            ${d.toLocaleDateString(
              "it-IT",
              {
                month:"short"
              }
            )}
          </div>

        </div>

        ${
          arr.length

          ?arr.map(e=>`

            <div class="miniEvent ${e.category}">

              <div class="miniTime">
                ${e.time}
              </div>

              <div class="miniTitle">
                ${escapeHtml(e.title)}
              </div>

              <div class="miniActions">

                <button
                  type="button"
                  class="editEventBtn"
                  data-id="${e.id}">
                  ✏️
                </button>

                <button
                  type="button"
                  class="deleteEventBtn"
                  data-id="${e.id}">
                  🗑️
                </button>

              </div>

            </div>

          `).join("")

          :`
            <div class="meta">
              Nessun impegno
            </div>
          `
        }

      </div>
    `;

  }).join("");
}


/* =========================
   RENDER MESE
========================= */

function renderMonth(){

  const first=startOfMonth(today);

  const gridStart=startOfWeek(first);

  const cells=[];

  for(let i=0;i<42;i++){

    const d=new Date(gridStart);

    d.setDate(gridStart.getDate()+i);

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
  .map(x=>`
    <div class="weekdayHead">
      ${x}
    </div>
  `)
  .join("");


  const body=cells.map(d=>{

    const ds=localIso(d);

    const arr=eventMap(ds);

    const other=
      d.getMonth()!==first.getMonth();

    const isToday=
      ds===iso(today);


    return `
      <div class="monthCell
        ${other?"other":""}
        ${isToday?"today":""}">

        <div class="monthNumber">
          ${d.getDate()}
        </div>


        ${
          arr.slice(0,4).map(e=>`

            <div
              class="monthEvent ${e.category}"
              title="${escapeHtml(e.title)}">

              <span>
                ${e.time}
                ${escapeHtml(e.title)}
              </span>

              <span class="monthActions">

                <button
                  type="button"
                  class="editEventBtn"
                  data-id="${e.id}">
                  ✏️
                </button>

                <button
                  type="button"
                  class="deleteEventBtn"
                  data-id="${e.id}">
                  🗑️
                </button>

              </span>

            </div>

          `).join("")
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

      </div>
    `;

  }).join("");


  $("monthList").innerHTML=
    heads+body;
}


/* =========================
   RENDER COMPLETO
========================= */

function renderAll(){

  const n=render(
    $("todayList"),
    iso(today)
  );

  $("eventCount").textContent=n;

  $("taskCount").textContent="0";

  renderWeek();

  renderMonth();

  render(
    $("dateList"),
    $("calendarDate").value
  );
}


renderAll();


/* =========================
   CAMBIO TAB
========================= */

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


/* =========================
   CALENDARIO
========================= */

$("calendarDate").onchange=()=>{

  render(
    $("dateList"),
    $("calendarDate").value
  );

};


/* =========================
   NUOVA ATTIVITÀ
========================= */

function openNewEvent(){

  editingEventId=null;

  $("eventForm").reset();

  $("date").value=iso(today);

  $("reminder").value="30";

  $("reminderType").value="notification";


  if($("modalTitle"))
    $("modalTitle").textContent=
      "Nuovo impegno";


  if($("saveEventBtn"))
    $("saveEventBtn").textContent=
      "Salva impegno";


  $("modal")
    .classList
    .remove("hidden");
}


/* =========================
   MODIFICA ATTIVITÀ
========================= */

function openEditEvent(id){

  const event=events.find(
    e=>String(e.id)===String(id)
  );

  if(!event) return;


  editingEventId=event.id;


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


  if($("modalTitle"))
    $("modalTitle").textContent=
      "Modifica impegno";


  if($("saveEventBtn"))
    $("saveEventBtn").textContent=
      "Salva modifiche";


  $("modal")
    .classList
    .remove("hidden");
}


/* =========================
   ELIMINA ATTIVITÀ
========================= */

function deleteEvent(id){

  const event=events.find(
    e=>String(e.id)===String(id)
  );

  if(!event) return;


  const ok=confirm(
    `Vuoi eliminare l'attività "${event.title}"?`
  );


  if(!ok) return;


  /* Cancella eventuale promemoria */

  if(reminderTimers.has(event.id)){

    clearTimeout(
      reminderTimers.get(event.id)
    );

    reminderTimers.delete(event.id);
  }


  /* Ferma l'allarme se è quello attivo */

  if(activeAlarmId===event.id){

    stopAlarm();
  }


  /* Elimina attività */

  events=events.filter(
    e=>String(e.id)!==String(id)
  );


  save();

  renderAll();
}


/* =========================
   APRI MODALE
========================= */

$("addBtn").onclick=async()=>{

  await requestNotificationPermission();

  openNewEvent();

};


/* =========================
   CHIUDI MODALE
========================= */

$("closeBtn").onclick=()=>{

  editingEventId=null;

  $("modal")
    .classList
    .add("hidden");

};


$("modal").onclick=e=>{

  if(e.target.id==="modal"){

    editingEventId=null;

    $("modal")
      .classList
      .add("hidden");
  }

};


/* =========================
   SALVATAGGIO ATTIVITÀ
========================= */

$("eventForm").onsubmit=async e=>{

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


  /* Richiesta permesso notifiche */

  if(
    eventData.reminderType==="notification"
  ){

    await requestNotificationPermission();

  }


  /* =====================
     MODIFICA
  ===================== */

  if(editingEventId!==null){

    const index=events.findIndex(
      x=>String(x.id)===
         String(editingEventId)
    );


    if(index!==-1){

      const updatedEvent={
        ...events[index],
        ...eventData
      };


      /* Cancella vecchio timer */

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


      /* Salva modifica */

      events[index]=updatedEvent;

      save();


      /* Programma nuovo promemoria */

      scheduleReminder(
        updatedEvent
      );
    }

  }


  /* =====================
     NUOVA ATTIVITÀ
  ===================== */

  else{

    const newEvent={

      id:Date.now(),

      ...eventData

    };


    events.push(newEvent);

    save();

    scheduleReminder(newEvent);
  }


  /* Reset */

  editingEventId=null;

  e.target.reset();

  $("date").value=iso(today);

  $("reminder").value="30";

  $("reminderType").value=
    "notification";


  if($("modalTitle"))
    $("modalTitle").textContent=
      "Nuovo impegno";


  if($("saveEventBtn"))
    $("saveEventBtn").textContent=
      "Salva impegno";


  $("modal")
    .classList
    .add("hidden");


  renderAll();

};


/* =========================
   NOTIFICHE
========================= */

async function requestNotificationPermission(){

  if(!("Notification" in window))
    return false;


  if(
    Notification.permission===
    "granted"
  )
    return true;


  if(
    Notification.permission===
    "denied"
  )
    return false;


  try{

    return(
      await Notification
        .requestPermission()
    )==="granted";

  }catch{

    return false;

  }

}


/* =========================
   CALCOLO PROMEMORIA
========================= */

function reminderAt(event){

  const [h,m]=
    event.time
    .split(":")
    .map(Number);


  const d=new Date();


  d.setFullYear(

    Number(
      event.date.slice(0,4)
    ),

    Number(
      event.date.slice(5,7)
    )-1,

    Number(
      event.date.slice(8,10)
    )

  );


  d.setHours(
    h,
    m,
    0,
    0
  );


  return(
    d.getTime()-
    Number(event.reminder||0)*
    60000
  );
}


/* =========================
   PROGRAMMA PROMEMORIA
========================= */

function scheduleReminder(event){

  if(
    reminderTimers.has(event.id)
  ){

    clearTimeout(
      reminderTimers.get(event.id)
    );

    reminderTimers.delete(
      event.id
    );
  }


  const delay=
    reminderAt(event)-
    Date.now();


  if(delay<=0)
    return;


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


/* =========================
   PROGRAMMA TUTTI
========================= */

function scheduleAllReminders(){

  events.forEach(
    scheduleReminder
  );

}


/* =========================
   ATTIVA PROMEMORIA
========================= */

async function fireReminder(event){

  /* ALLARME */

  if(
    event.reminderType==="alarm"
  ){

    startAlarm(event);

    return;
  }


  /* NOTIFICA */

  const granted=
    await requestNotificationPermission();


  const text=
    `${event.time} · ${event.category}`;


  if(granted){

    try{

      const reg=
        await navigator
        .serviceWorker
        .ready;


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

    }catch{}

  }


  /* Fallback */

  showInAppMessage(event);

}


/* =========================
   FALLBACK
========================= */

function showInAppMessage(event){

  startAlarm(
    event,
    true
  );

}


/* =========================
   ALLARME
========================= */

function startAlarm(
  event,
  notificationFallback=false
){

  stopAlarm();


  activeAlarmId=
    event.id;


  $("alarmTitle")
    .textContent=
      event.title;


  $("alarmInfo")
    .textContent=
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

    alarmAudio
      .play()
      .catch(()=>{});

  }catch{}

}


/* =========================
   FERMA ALLARME
========================= */

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


/* =========================
   MODIFICA / ELIMINA
========================= */

/*
   Usiamo la gestione sul document
   perché i pulsanti vengono ricreati
   ogni volta che la pagina viene renderizzata.
*/

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


/* =========================
   VISIBILITÀ APP
========================= */

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


/* =========================
   AVVIO PROMEMORIA
========================= */

scheduleAllReminders();


/* =========================
   SERVICE WORKER
========================= */

if("serviceWorker" in navigator){

  window.addEventListener(
    "load",
    ()=>navigator
      .serviceWorker
      .register("./sw.js")
  );

}
