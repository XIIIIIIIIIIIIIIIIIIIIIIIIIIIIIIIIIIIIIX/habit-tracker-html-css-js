
const DAYS = ['dim','lun','mar','mer','jeu','ven','sam'];
const STORAGE_KEY = 'habitsApp.v2';

let state = {
  habits: [],
  marks: {}, // dateISO: {habitId: true/false}
  notifications: { enabled: false, time: "20:00" }
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return;
  try {
    let parsed = JSON.parse(s);
    if(!parsed.habits) throw "";
    state = parsed;
  } catch { }
}
function generateId() {
  return '_' + Math.random().toString(36).substr(2,9);
}
function todayISO() {
  let now = new Date();
  now.setHours(0,0,0,0);
  return now.toISOString().slice(0,10);
}
function prevISO(days=1) {
  let d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0,10);
}
function formatDate(d) {
  const date = new Date(d);
  return `${DAYS[date.getDay()]} ${date.getDate()}/${date.getMonth()+1}`;
}
// ---------- Rendering ----------
function renderHabits() {
  const ul = document.getElementById('habits-list');
  ul.innerHTML = '';
  state.habits.forEach(hab => {
    let li = document.createElement('li');
    let span = document.createElement('span');
    span.textContent = hab.name;
    span.classList.add('habit-name');
    li.appendChild(span);
    let act = document.createElement('div');
    act.classList.add('habit-actions');
    let del = document.createElement('button');
    del.textContent = '✖';
    del.onclick = () => { 
      state.habits = state.habits.filter(h=>h.id!==hab.id);
      // Clean up marks
      for(let d in state.marks) delete state.marks[d][hab.id];
      saveState(); renderAll();
    };
    let hist = document.createElement('button');
    hist.textContent = '🕑';
    hist.title = "Voir historique";
    hist.onclick = ()=> showHabitHistory(hab.id, hab.name);
    act.appendChild(hist);
    act.appendChild(del);
    li.appendChild(act);
    ul.appendChild(li);
  });
}
function renderTodayList() {
  const div = document.getElementById('today-list');
  div.innerHTML = '';
  let today = todayISO();
  if (!state.marks[today]) state.marks[today]={};
  if (state.habits.length===0) {
    div.innerHTML = `<em>Ajoutez une habitude à suivre !</em>`;
    return;
  }
  state.habits.forEach(hab=>{
    let wrap = document.createElement('div');
    wrap.style.display="flex";wrap.style.alignItems="center";
    let chk = document.createElement('input');
    chk.type="checkbox";
    chk.checked = !!state.marks[today][hab.id];
    chk.onchange = ()=>{
      state.marks[today][hab.id]=chk.checked;
      saveState(); renderAll();
    };
    let lbl = document.createElement('label');
    lbl.textContent = hab.name;
    lbl.style.marginLeft="0.6em";
    wrap.appendChild(chk);
    wrap.appendChild(lbl);
    div.appendChild(wwrap);
  });
}
function renderMarkAllBtn() {
  document.getElementById('mark-all-done').onclick = ()=>{
    let today = todayISO();
    if (!state.marks[today]) state.marks[today]={};
    state.habits.forEach(hab=>{
      state.marks[today][hab.id]=true;
    });
    saveState(); renderAll();
  };
}
function renderHistoryList() {
  const hist = document.getElementById('history-list');
  let html = '';
  for(let i=0;i<7;i++) {
    let date = prevISO(i);
    html+=`<b>${formatDate(date)}:</b> `;
    if(!state.marks[date] || Object.keys(state.marks[date]).length===0) {
      html+="Aucune donnée.<br>";
      continue;
    }
    let items = [];
    for(let hab of state.habits) {
      let done = state.marks[date][hab.id];
      items.push(`<span style="color:${done?'green':'#aaa'}">${hab.name} ${done?'✅':'❌'}</span>`);
    }
    html+=items.join(', ')+'<br>';
  }
  hist.innerHTML = html;
}
function renderStatsText() {
  let doneCnt=0,total=0,streak=0,maxStreak=0,lastDoneDay=0;
  let daysBack=30;
  for(let hab of state.habits){
    let currStreak=0,maxThis=0,last=0;
    for(let i=0;i<daysBack;i++) {
      let date = prevISO(i);
      if(state.marks[date]?.[hab.id]) {
        doneCnt++; total++;
        currStreak++;
        maxThis=Math.max(maxThis,currStreak);
        if(i===0)last=1;
      } else {
        total++;
        currStreak=0;
      }
    }
    streak += currStreak;
    maxStreak = Math.max(maxStreak,maxThis);
    lastDoneDay += last;
  }
  if(state.habits.length) {
    let txt = `Habitudes suivies : <b>${state.habits.length}</b><br>
    Pourcentage de réussite (30j) : <b>${Math.round(doneCnt*100/Math.max(1,total))}%</b><br>
    Jour(s) consécutif(s) réussi(s) (toutes habitudes): <b>${streak}</b><br>
    Meilleure série (sur 30j) : <b>${maxStreak}</b><br>
    Habitudes faites aujourd’hui : <b>${lastDoneDay}</b> sur ${state.habits.length}`;
    document.getElementById('stats-text').innerHTML = txt;
  } else document.getElementById('stats-text').innerHTML = '';
}
function renderStatsChart() {
  const canvas = document.getElementById('stats-chart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  let w=canvas.width,h=canvas.height;
  let days=14;
  // calculate percent habits done per day
  let arr = [];
  for(let i=days-1;i>=0;i--) {
    let date = prevISO(i);
    let marks = state.marks[date]||{};
    let c=0;
    state.habits.forEach(h=>{ if(marks[h.id])c++; });
    arr.push({date, count:c});
  }
  // max possible
  let max = Math.max(1,state.habits.length);
  // draw grid
  ctx.strokeStyle="#e3e6ef";
  ctx.lineWidth=1;
  for(let y=0;y<=max;y++) {
    let yy = h-25 - y*(h-40)/max;
    ctx.beginPath();
    ctx.moveTo(30,yy);ctx.lineTo(w-10,yy);ctx.stroke();
    ctx.fillStyle = "#bbb";
    ctx.font="11px Arial";
    ctx.fillText(y,13,yy+4);
  }
  // draw line
  ctx.beginPath();
  arr.forEach((d,i)=>{
    let x = 30 + i*(w-50)/(days-1);
    let y = h-25 - d.count*(h-40)/max;
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.strokeStyle= "#3e65aa";
  ctx.lineWidth=2;
  ctx.stroke();
  // points
  arr.forEach((d,i)=>{
    let x = 30 + i*(w-50)/(days-1);
    let y = h-25 - d.count*(h-40)/max;
    ctx.beginPath();
    ctx.arc(x,y,4,0,2*Math.PI);
    ctx.fillStyle=d.count===max?"#44bb66":"#ff8c42";
    ctx.fill();
  });
  // x labels
  ctx.fillStyle="#555";
  ctx.font="11px Arial";
  arr.forEach((d,i)=>{
    let x = 30 + i*(w-50)/(days-1);
    ctx.fillText(DAYS[new Date(d.date).getDay()],x-10,h-7);
  });
}
function showHabitHistory(habitId, habitName) {
  let msg = `<b>${habitName}</b> — Données sur 30 jours :<br>`;
  for(let i=0;i<30;i++) {
    let date = prevISO(i);
    let failed = state.marks[date]?.[habitId]? '✅': '❌';
    msg += `${formatDate(date)} : ${failed}<br>`;
  }
  let win = window.open("",habitName,'width=320,height=450');
  win.document.body.innerHTML = "<style>body{font-family:sans-serif;padding:1em;}</style>"+msg;
  win.document.title = "Historique : " + habitName;
}
// ----- Notification logic -----
let notifGranted = false, notifTimeout = null;
function renderNotPfSettings() {
  const timeI = document.getElementById('notif-time');
  const status = document.getElementById('notif-status');
  timeI.value = state.notifications.time;
  document.getElementById('enable-notifs').onclick = async function() {
    if("Notification" in window === false) {
      status.textContent = "Notifications non supportées.";
      return;
    }
    if(Notification.permission !== "granted") {
      let perm = await Notification.requestPermission();
      if(perm!=="granted") { status.textContent="Autorisation refusée."; return;}
    }
    notifGranted = true;
    state.notifications.enabled = true;
  state.notifications.time = timeI.value;
    saveState();
    status.textContent="Notifications activées.";
    scheduleNotification();
  };
  timeI.onchange = ()=> {
    state.notifications.time = timeI.value;
    saveState();
    if(notifGranted) scheduleNotification();
  };
  if(state.notifications.enabled) {
    status.textContent="Activées.";
    notifGranted = (Notification.permission==="granted");
    scheduleNotification();
  }
}
function scheduleNotification() {
  if(notifTimeout) clearTimeout(notifTimeout);
  if(!state.notifications.enabled || !notifGranted) return;
  let [h,m] = state.notifications.time.split(":").map(Number);
  let now = new Date();
  let t = new Date();
  t.setHours(h,m,0,0);
  if(t<now) t.setDate(t.getDate()+1);
  let ms = t - now;
  notifTimeout = setTimeout(()=>{
    showHabitNotif();
    scheduleNotification(); // for next day
  }, ms);
}
function showHabitNotif() {
  if(document.hasFocus()) return; // avoid annoying user
  let undones = [];
  let today = todayISO();
  for(let h of state.habits) {
    if(!state.marks[today] || !state.marks[today][h.id]) undones.push(h.name);
  }
  if(undones.length===0) return;
  let body = "À ne pas oublier :\n"+undones.join('\n');
  new Notification("Suivi d’habitudes 🕑", { body });
}
// ---- Main render all ----
function renderAll() {
  renderHabits();
  renderTodayList();
  renderMarkAllBtn();
  renderHistoryList();
  renderStatsText();
  renderStatsChart();
  renderNotifSettings();
  document.getElementById('current-date').innerText = formatDate(todayISO());
}
// --- Event Listeners ---
document.getElementById('habit-form').onsubmit = (e)=>{
  e.preventDefault();
  let input = document.getElementById('habit-name');
  let name = input.value.trim();
  if(!name) return;
  state.habits.push({ id:generateId(), name });
  input.value='';
  saveState();
  renderAll();
};
document.addEventListener('DOMContentLoaded', ()=>{
  loadState();
  renderAll();
});