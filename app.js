const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>d.toISOString().slice(0,10);
const key="agenda_personale_events";
let events=JSON.parse(localStorage.getItem(key)||"[]");
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
    <div class="meta">🔔 ${reminderText(e.reminder)}</div>
  </article>`).join(""):`<div class="empty">Nessun impegno per questa giornata.</div>`;
  return arr.length;
}
function reminderText(v){return v==="0"?"all'orario":v==="10"?"10 min prima":v==="30"?"30 min prima":v==="60"?"1 ora prima":"1 giorno prima"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderAll(){
  const n=render($("todayList"),iso(today));
  $("eventCount").textContent=n;
  $("taskCount").textContent="0";
  render($("dateList"),$("calendarDate").value);
}
renderAll();

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active"); $(btn.dataset.view).classList.add("active");
});
$("calendarDate").onchange=()=>render($("dateList"),$("calendarDate").value);
$("addBtn").onclick=()=>$("modal").classList.remove("hidden");
$("closeBtn").onclick=()=>$("modal").classList.add("hidden");
$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};

$("eventForm").onsubmit=e=>{
 e.preventDefault();
 events.push({id:Date.now(),title:$("title").value,description:$("description").value,date:$("date").value,time:$("time").value,category:$("category").value,reminder:$("reminder").value,notes:$("notes").value});
 save(); e.target.reset(); $("date").value=iso(today); $("reminder").value="30";
 $("modal").classList.add("hidden"); renderAll();
};
if("Notification" in window && Notification.permission==="default") Notification.requestPermission();
