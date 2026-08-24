const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const key="agenda_personale_events";
let events=JSON.parse(localStorage.getItem(key)||"[]");
const reminderTimers=new Map();
let alarmAudio=null;
let activeAlarmId=null;

$("today").textContent=today.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
$("date").value=iso(today); $("calendarDate").value=iso(today);

function save(){localStorage.setItem(key,JSON.stringify(events))}
function render(listEl,date){
  const arr=events.filter(e=>e.date===date).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  listEl.innerHTML=arr.length?arr.map(e=>`<article class="event ${e.category}">
    <div class="eventTop"><div class="time">${e.time}</div><span class="badge">${e.category}</span></div>
    <h3>${escapeHtml(e.title)}</h3>
    ${e.description?`<div class="meta"><strong>Descrizione:</strong> ${escapeHtml(e.description)}</div>`:""}
    ${e.notes?`<div class="meta"><strong>Note:</strong> ${escapeHtml(e.notes)}</div>`:""}
    <div class="meta">🔔 ${reminderText(e.reminder)} · ${e.reminderType==="alarm"?"⏰ Allarme":"Notifica"}</div>
  </article>`).join(""):`<div class="empty">Nessun impegno per questa giornata.</div>`;
  return arr.length;
}
function reminderText(v){return v==="0"?"all'orario":v==="10"?"10 min prima":v==="30"?"30 min prima":v==="60"?"1 ora prima":"1 giorno prima"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function pad(n){return String(n).padStart(2,"0")}
function localIso(d){return iso(d)}
function startOfWeek(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
function startOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function eventMap(dateStr){return events.filter(e=>e.date===dateStr).sort((a,b)=>(a.time||"").localeCompare(b.time||""))}

function renderWeek(){
  const start=startOfWeek(today),days=[];
  for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d)}
  const end=days[6];
  $("weekLabel").textContent=`${start.toLocaleDateString("it-IT",{day:"numeric",month:"long"})} – ${end.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})}`;
  $("weekList").innerHTML=days.map(d=>{
    const ds=localIso(d),arr=eventMap(ds),label=d.toLocaleDateString("it-IT",{weekday:"short"}).replace(".","");
    return `<div class="dayColumn"><div class="dayHead">${label}<div class="dayDate">${d.getDate()} ${d.toLocaleDateString("it-IT",{month:"short"})}</div></div>
    ${arr.length?arr.map(e=>`<div class="miniEvent ${e.category}"><div class="miniTime">${e.time}</div><div class="miniTitle">${escapeHtml(e.title)}</div></div>`).join(""):`<div class="meta">Nessun impegno</div>`}</div>`;
  }).join("");
}
function renderMonth(){
  const first=startOfMonth(today),gridStart=startOfWeek(first),cells=[];
  for(let i=0;i<42;i++){const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);cells.push(d)}
  $("monthLabel").textContent=first.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  const heads=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(x=>`<div class="weekdayHead">${x}</div>`).join("");
  const body=cells.map(d=>{
    const ds=localIso(d),arr=eventMap(ds),other=d.getMonth()!==first.getMonth(),isToday=ds===iso(today);
    return `<div class="monthCell ${other?"other":""} ${isToday?"today":""}"><div class="monthNumber">${d.getDate()}</div>
    ${arr.slice(0,4).map(e=>`<div class="monthEvent ${e.category}" title="${escapeHtml(e.title)}">${e.time} ${escapeHtml(e.title)}</div>`).join("")}
    ${arr.length>4?`<div class="meta">+${arr.length-4} altri</div>`:""}</div>`;
  }).join("");
  $("monthList").innerHTML=heads+body;
}
function renderAll(){
  const n=render($("todayList"),iso(today));
  $("eventCount").textContent=n;$("taskCount").textContent="0";renderWeek();renderMonth();render($("dateList"),$("calendarDate").value);
}
renderAll();

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$(btn.dataset.view).classList.add("active");
});
$("calendarDate").onchange=()=>render($("dateList"),$("calendarDate").value);
$("addBtn").onclick=async()=>{await requestNotificationPermission();$("modal").classList.remove("hidden")};
$("closeBtn").onclick=()=>$("modal").classList.add("hidden");
$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};

$("eventForm").onsubmit=async e=>{
  e.preventDefault();
  const event={
    id:Date.now(),
    title:$("title").value.trim(),
    description:$("description").value.trim(),
    date:$("date").value,
    time:$("time").value,
    category:$("category").value,
    reminder:$("reminder").value,
    reminderType:$("reminderType").value,
    notes:$("notes").value.trim()
  };
  if(event.reminderType==="notification") await requestNotificationPermission();
  events.push(event);save();
  scheduleReminder(event);
  e.target.reset();$("date").value=iso(today);$("reminder").value="30";$("reminderType").value="notification";
  $("modal").classList.add("hidden");renderAll();
};

async function requestNotificationPermission(){
  if(!("Notification" in window)) return false;
  if(Notification.permission==="granted") return true;
  if(Notification.permission==="denied") return false;
  try{return (await Notification.requestPermission())==="granted"}catch{return false}
}

function reminderAt(event){
  const [h,m]=event.time.split(":").map(Number);
  const d=new Date();
  d.setFullYear(Number(event.date.slice(0,4)),Number(event.date.slice(5,7))-1,Number(event.date.slice(8,10)));
  d.setHours(h,m,0,0);
  return d.getTime()-Number(event.reminder||0)*60000;
}
function scheduleReminder(event){
  if(reminderTimers.has(event.id)) clearTimeout(reminderTimers.get(event.id));
  const delay=reminderAt(event)-Date.now();
  if(delay<=0) return;
  const timer=setTimeout(()=>fireReminder(event),delay);
  reminderTimers.set(event.id,timer);
}
function scheduleAllReminders(){events.forEach(scheduleReminder)}
async function fireReminder(event){
  if(event.reminderType==="alarm"){startAlarm(event);return}
  const granted=await requestNotificationPermission();
  const text=`${event.time} · ${event.category}`;
  if(granted){
    try{
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification("Agenda Personale",{body:`${event.title}\n${text}`,icon:"./icons/icon-192.png",badge:"./icons/icon-192.png",tag:`agenda-${event.id}`,requireInteraction:true,data:{eventId:event.id}});
      return;
    }catch{}
  }
  // Fallback se le notifiche non sono disponibili.
  showInAppMessage(event);
}
function showInAppMessage(event){
  startAlarm(event,true);
}
function startAlarm(event,notificationFallback=false){
  stopAlarm();
  activeAlarmId=event.id;
  $("alarmTitle").textContent=event.title;
  $("alarmInfo").textContent=`${event.date} · ${event.time}${notificationFallback?" · notifiche non disponibili":" · allarme"}`;
  $("alarmModal").classList.remove("hidden");
  try{
    alarmAudio=new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////AAAA////");
    alarmAudio.loop=true;alarmAudio.volume=.95;alarmAudio.play().catch(()=>{});
  }catch{}
}
function stopAlarm(){
  if(alarmAudio){alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio=null}
  $("alarmModal").classList.add("hidden");activeAlarmId=null;
}
$("stopAlarmBtn").onclick=stopAlarm;

document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleAllReminders()});
window.addEventListener("focus",scheduleAllReminders);
scheduleAllReminders();

if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"))}
