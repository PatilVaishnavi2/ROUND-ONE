import { nativeNotifications } from "./native-notifications.js";
/* =========================================================
   ROUND ONE — daily discipline tracker
   Pure HTML/CSS/JS. All state lives in localStorage.
========================================================= */

/* ---------- 1. THE SCHEDULE (edit times/labels here) ---------- */
const BASE_SCHEDULE = [
  { id: "water-1",        time: "06:00", label: "300 ml water",              icon: "💧", cat: "water" },
  { id: "herb-kadipatta", time: "06:10", label: "Kadipatta",                 icon: "🌿", cat: "herb"  },
  { id: "stretch-1",      time: "06:20", label: "Stretching",                icon: "🤸", cat: "rest"  },
  { id: "boxing-1",       time: "06:40", label: "Boxing — 2 hrs",            icon: "🥊", cat: "box"   },
  { id: "herb-moringa",   time: "08:40", label: "Breakfast + Moringa",       icon: "🍃", cat: "meal"  },
  { id: "study-1",        time: "09:15", label: "Study",                     icon: "📚", cat: "study" },
  { id: "rest-1",         time: "11:15", label: "Rest",                      icon: "😴", cat: "rest"  },
  { id: "study-2",        time: "11:45", label: "Study",                     icon: "📚", cat: "study" },
  { id: "lunch-1",        time: "13:15", label: "Lunch + water",             icon: "🍽️", cat: "meal"  },
  { id: "study-3",        time: "14:05", label: "Study",                     icon: "📚", cat: "study" },
  { id: "rest-2",         time: "16:05", label: "Rest / walk",               icon: "😴", cat: "rest"  },
  { id: "herb-bhringraj", time: "16:35", label: "Bhringraj",                 icon: "🌿", cat: "herb"  },
  { id: "study-4",        time: "17:00", label: "Study",                     icon: "📚", cat: "study" },
  { id: "dinner-1",       time: "19:00", label: "Dinner",                    icon: "🍽️", cat: "meal"  },
  { id: "herb-isabgol",   time: "20:30", label: "Isabgol",                   icon: "🌿", cat: "herb"  },
  { id: "wind-1",         time: "20:45", label: "Wind down",                 icon: "😴", cat: "rest"  },
  { id: "plan-1",         time: "21:35", label: "Plan tomorrow + sleep prep",icon: "📝", cat: "custom"},
];
const HERB_IDS = ["herb-kadipatta", "herb-bhringraj", "herb-isabgol", "herb-moringa"];
const WATER_GOAL_ML = 3000;
const ALARM_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/* ---------- 2. STATE ---------- */
function todayKey(d = new Date()) {
  return `routine:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayLabel(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const SETTINGS_KEY = "routine:settings";
function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { remindersOn: true };
  } catch { return { remindersOn: true }; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function emptyDayState() {
  return { completed: {}, water: 0, extra: [], fired: {} };
}
function loadDayState() {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return emptyDayState();
    const parsed = JSON.parse(raw);
    return { ...emptyDayState(), ...parsed };
  } catch { return emptyDayState(); }
}
function saveDayState() { localStorage.setItem(todayKey(), JSON.stringify(state)); }

let settings = loadSettings();
let state = loadDayState();
let currentDayKey = todayKey();

/* ---------- 3. DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const timelineEl = $("#timeline");
const herbListEl = $("#herbList");
const progressPctEl = $("#progressPct");
const progressFillEl = $("#progressFill");
const nowTaskEl = $("#nowTask");
const nowMetaEl = $("#nowMeta");
const nowLabelEl = $("#nowLabel");
const todayDateEl = $("#todayDate");
const waterAmountEl = $("#waterAmount");
const waterFillEl = $("#waterFill");
const soundToggleBtn = $("#soundToggle");
const soundToggleLabel = $("#soundToggleLabel");
const resetBtn = $("#resetBtn");
const addTaskForm = $("#addTaskForm");
const alarmBar = $("#alarmBar");
const alarmTitle = $("#alarmTitle");
const alarmDoneBtn = $("#alarmDone");
const alarmStopBtn = $("#alarmStop");
const toastEl = $("#toast");
const notifyBtn = $("#notifyBtn");
const notifyLabel = $("#notifyLabel");
const installBtn = $("#installBtn");
const installHelp = $("#installHelp");
const installHelpClose = $("#installHelpClose");
const statTasks = $("#statTasks");
const statWater = $("#statWater");
const statStudy = $("#statStudy");
const statStreak = $("#statStreak");
const progressTasksText = $("#progressTasksText");
const progressWaterText = $("#progressWaterText");
const progressTasksBar = $("#progressTasksBar");
const progressWaterBar = $("#progressWaterBar");

todayDateEl.textContent = todayLabel();

/* ---------- 4. FULL SCHEDULE (base + user-added extras), sorted ---------- */
function fullSchedule() {
  const extra = state.extra.map((t) => ({ ...t, cat: "custom", icon: t.icon || "📝" }));
  return [...BASE_SCHEDULE, ...extra].sort((a, b) => a.time.localeCompare(b.time));
}

/* ---------- 5. RENDER ---------- */
function render() {
  const items = fullSchedule();
  const nowStr = currentHHMM();

  // find "current" task: last one whose time <= now
  let currentIdx = -1;
  items.forEach((t, i) => { if (t.time <= nowStr) currentIdx = i; });

  timelineEl.innerHTML = "";
  items.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "task" + (state.completed[t.id] ? " is-done" : "") + (i === currentIdx ? " is-now" : "");
    li.dataset.cat = t.cat;

    const isCustom = t.id.startsWith("custom-");
    li.innerHTML = `
      <span class="task-time">${t.time}</span>
      <span class="task-body">
        <span class="task-label"><span class="task-icon">${t.icon}</span>${escapeHtml(t.label)}</span>
        <span class="task-cat">${t.cat}</span>
      </span>
      <span style="display:flex;align-items:center;gap:6px;">
        <input type="checkbox" class="task-check" data-id="${t.id}" ${state.completed[t.id] ? "checked" : ""} aria-label="Mark ${escapeHtml(t.label)} done">
        ${isCustom ? `<button class="task-remove" data-remove="${t.id}" title="Remove task" aria-label="Remove ${escapeHtml(t.label)}">✕</button>` : ""}
      </span>
    `;
    timelineEl.appendChild(li);
  });

  // herb widget
  herbListEl.innerHTML = "";
  HERB_IDS.forEach((id) => {
    const t = BASE_SCHEDULE.find((x) => x.id === id);
    if (!t) return;
    const li = document.createElement("li");
    li.className = "herb-item" + (state.completed[id] ? " is-done" : "");
    li.innerHTML = `
      <span class="herb-name">${t.icon} ${escapeHtml(t.label)}</span>
      <span style="display:flex;align-items:center;gap:8px;">
        <span class="herb-time">${t.time}</span>
        <input type="checkbox" class="task-check" data-id="${id}" ${state.completed[id] ? "checked" : ""} style="width:20px;height:20px;">
      </span>
    `;
    herbListEl.appendChild(li);
  });

  // progress
  const total = items.length;
  const done = items.filter((t) => state.completed[t.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressPctEl.textContent = `${pct}%`;
  progressFillEl.style.width = `${pct}%`;

  // now card
  if (currentIdx === -1) {
    nowLabelEl.textContent = "UP NEXT";
    nowTaskEl.textContent = items.length ? `${items[0].icon} ${items[0].label}` : "No tasks yet";
    nowMetaEl.textContent = items.length ? `Starts at ${items[0].time}` : "Add your first task below";
  } else {
    const cur = items[currentIdx];
    const next = items[currentIdx + 1];
    nowLabelEl.textContent = state.completed[cur.id] ? "LAST DONE" : "RIGHT NOW";
    nowTaskEl.textContent = `${cur.icon} ${cur.label}`;
    nowMetaEl.textContent = next ? `Since ${cur.time} · next up: ${next.icon} ${next.label} at ${next.time}` : `Since ${cur.time} · last task of the day`;
  }

  // water
  const waterPct = Math.round((state.water / WATER_GOAL_ML) * 100);
  waterAmountEl.textContent = state.water;
  waterFillEl.style.height = `${Math.min(100, waterPct)}%`;

  // quick stats
  const studyBlocks = items.filter((t) => t.cat === "study" && state.completed[t.id]).length;
  const streak = calculateStreak();
  statTasks.textContent = `${done}/${total}`;
  statWater.textContent = `${Math.min(100, waterPct)}%`;
  statStudy.textContent = `${studyBlocks} ${studyBlocks === 1 ? "block" : "blocks"}`;
  statStreak.textContent = String(streak);
  progressTasksText.textContent = `${pct}%`;
  progressWaterText.textContent = `${Math.min(100, waterPct)}%`;
  progressTasksBar.style.width = `${pct}%`;
  progressWaterBar.style.width = `${Math.min(100, waterPct)}%`;

  saveDayState();
}

function calculateStreak() {
  let streak = 0;
  const d = new Date();
  while (streak < 365) {
    const key = todayKey(d);
    let day;
    try { day = JSON.parse(localStorage.getItem(key) || "null"); } catch { day = null; }
    if (!day) break;
    const completedCount = Object.values(day.completed || {}).filter(Boolean).length;
    const extraCount = Array.isArray(day.extra) ? day.extra.length : 0;
    const total = BASE_SCHEDULE.length + extraCount;
    const waterDone = (day.water || 0) >= WATER_GOAL_ML;
    if (completedCount < total || !waterDone) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function updateNotificationUI() {
  if (!("Notification" in window)) {
    notifyLabel.textContent = "N/A";
    notifyBtn.disabled = true;
    return;
  }
  const permission = Notification.permission;
  notifyLabel.textContent = permission === "granted" ? "On" : permission === "denied" ? "Blocked" : "Notify";
}

async function requestWebNotifications() {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications");
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    updateNotificationUI();
    showToast(permission === "granted" ? "Notifications enabled" : "Notification permission not granted");
  } catch {
    showToast("Could not request notification permission");
  }
}

function showWebNotification(task) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification("ROUND ONE", { body: `${task.icon} ${task.label} — starting now`, icon: "icon-192.png", tag: `round-one-${task.id}` });
  } catch {}
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function currentHHMM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------- 6. EVENTS: complete / remove / add ---------- */
document.body.addEventListener("change", (e) => {
  if (e.target.classList.contains("task-check")) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      state.completed[id] = true;
      if (activeAlarmId === id) stopAlarm();
    } else {
      delete state.completed[id];
    }
    render();
  }
});

document.body.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    const id = rm.dataset.remove;
    state.extra = state.extra.filter((t) => t.id !== id);
    delete state.completed[id];
    render();
  }
  const waterBtn = e.target.closest(".btn-water");
  if (waterBtn) {
    const delta = parseInt(waterBtn.dataset.ml, 10);
    state.water = Math.max(0, Math.min(WATER_GOAL_ML, state.water + delta));
    render();
  }
});

addTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const time = $("#addTaskTime").value;
  const name = $("#addTaskName").value.trim();
  if (!time || !name) return;
  const id = `custom-${Date.now()}`;
  state.extra.push({ id, time, label: name, icon: "📝" });
  addTaskForm.reset();
  render();
  showToast("Task added to today's plan");
});

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset today's ticks, water and fired reminders? Your added tasks stay.")) return;
  state.completed = {};
  state.water = 0;
  state.fired = {};
  render();
  showToast("Day reset — fresh card");
});

/* ---------- 7. SOUND / REMINDER TOGGLE ---------- */
function refreshSoundToggleUI() {
  soundToggleBtn.setAttribute("aria-pressed", String(settings.remindersOn));
  soundToggleLabel.textContent = "Bell";
  soundToggleLabel.textContent = settings.remindersOn ? "Bell ON" : "Bell OFF";
}
soundToggleBtn.addEventListener("click", async () => {
  settings.remindersOn = !settings.remindersOn;
  saveSettings(settings);
  refreshSoundToggleUI();
  ensureAudioContext();
  if (settings.remindersOn && nativeNotifications) {
    await nativeNotifications.permission();
    await syncNativeReminders();
  }
  showToast(settings.remindersOn ? "Reminders on — you'll get a 2-minute ring + notification" : "Reminders silenced");
});
refreshSoundToggleUI();
updateNotificationUI();
notifyBtn.addEventListener("click", requestWebNotifications);

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  } else {
    installHelp.hidden = false;
  }
});
installHelpClose.addEventListener("click", () => { installHelp.hidden = true; });
installHelp.addEventListener("click", (e) => { if (e.target === installHelp) installHelp.hidden = true; });

/* ---------- 8. NATIVE REMINDER SYNC ---------- */
async function syncNativeReminders() {
  if (!settings.remindersOn || !nativeNotifications) return;
  const tasks = fullSchedule();
  await nativeNotifications.scheduleDaily(tasks);
}

/* ---------- 8. REMINDER ENGINE ---------- */
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

let activeAlarmId = null;
let alarmBeepTimer = null;
let alarmStopTimer = null;

function beepOnce() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    const start = ctx.currentTime + i * 0.16;
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

function triggerReminder(task) {
  activeAlarmId = task.id;
  alarmTitle.textContent = `Time for: ${task.icon} ${task.label}`;
  alarmBar.hidden = false;

  if (nativeNotifications) {
    nativeNotifications.notify("ROUND ONE", `${task.icon} ${task.label} — starting now`);
  }
  showWebNotification(task);

  beepOnce();
  alarmBeepTimer = setInterval(beepOnce, 1200);
  alarmStopTimer = setTimeout(stopAlarm, ALARM_DURATION_MS);
}

function stopAlarm() {
  clearInterval(alarmBeepTimer);
  clearTimeout(alarmStopTimer);
  alarmBeepTimer = null;
  alarmStopTimer = null;
  activeAlarmId = null;
  alarmBar.hidden = true;
}

alarmStopBtn.addEventListener("click", stopAlarm);
alarmDoneBtn.addEventListener("click", () => {
  if (activeAlarmId) {
    state.completed[activeAlarmId] = true;
    render();
  }
  stopAlarm();
});

function checkReminders() {
  if (!settings.remindersOn) return;
  const nowStr = currentHHMM();
  fullSchedule().forEach((t) => {
    if (t.time === nowStr && !state.fired[t.id] && !state.completed[t.id]) {
      state.fired[t.id] = true;
      saveDayState();
      triggerReminder(t);
    }
  });
}
setInterval(checkReminders, 15000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updateNotificationUI();
    checkReminders();
    render();
  }
});
setInterval(syncNativeReminders, 60000);
setInterval(render, 30000); // keep "now" card + midnight rollover fresh

/* midnight rollover: reload state object when date changes */
setInterval(() => {
  const freshKey = todayKey();
  if (freshKey !== currentDayKey) {
    currentDayKey = freshKey;
    state = loadDayState();
    todayDateEl.textContent = todayLabel();
    render();
  }
}, 20000);
/* ---------- 9. TOAST ---------- */
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

/* ---------- 10. INIT ---------- */
if (settings.remindersOn && nativeNotifications) {
  nativeNotifications.permission().then(syncNativeReminders).catch(() => {});
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();


/* ---------- iPHONE PWA V3 NAVIGATION ---------- */
document.querySelectorAll(".mobile-nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const target = document.getElementById(targetId);
    if (!target) return;

    document.querySelectorAll(".mobile-nav-item").forEach((b) => {
      b.classList.toggle("active", b === button);
    });

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const mobileSections = [
  ["homeSection", document.querySelector('[data-target="homeSection"]')],
  ["routineSection", document.querySelector('[data-target="routineSection"]')],
  ["waterSection", document.querySelector('[data-target="waterSection"]')],
  ["progressSection", document.querySelector('[data-target="progressSection"]')],
].filter(([, el]) => el);

if ("IntersectionObserver" in window && mobileSections.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    const button = document.querySelector(`[data-target="${visible.target.id}"]`);
    if (!button) return;

    document.querySelectorAll(".mobile-nav-item").forEach((b) => {
      b.classList.toggle("active", b === button);
    });
  }, { threshold: [0.25, 0.5, 0.75] });

  mobileSections.forEach(([id]) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

/* ROUND ONE v5 personal routine */
const V5_ROUTINE=[
{id:"wake",time:"06:00",title:"Wake Up",meta:"Start the day • no social media"},
{id:"water-morning",time:"06:15",title:"Morning Water",meta:"Target 350–400 ml"},
{id:"morning-routine",time:"06:30",title:"Morning Routine",meta:"Kadipatta • Moringa • Bhringraj • Isabgol • freshen up"},
{id:"study-1",time:"07:15",title:"Deep Study #1",meta:"50 min focused study"},
{id:"breakfast",time:"08:15",title:"Breakfast",meta:"Breakfast + water"},
{id:"study-2",time:"08:45",title:"Deep Study #2",meta:"50 min focused study"},
{id:"college",time:"10:00",title:"College",meta:"College / commute block until 7:00 PM"},
{id:"lunch",time:"13:00",title:"Lunch",meta:"Proper meal + short break"},
{id:"water-college",time:"16:30",title:"Water Check",meta:"Hydration check"},
{id:"home",time:"19:00",title:"Home & Recovery",meta:"Change • snack • hydrate • decompress"},
{id:"study-3",time:"19:30",title:"Evening Study",meta:"50 min focused study"},
{id:"training-prep",time:"20:30",title:"Training Preparation",meta:"Light snack • hydrate • change • warm up"},
{id:"boxing",time:"21:00",title:"Boxing",meta:"60 min target • technique + conditioning"},
{id:"wind-down",time:"22:00",title:"Cool Down & Wind Down",meta:"Shower • skincare • prepare for tomorrow"},
{id:"daily-review",time:"22:20",title:"ROUND ONE Daily Review",meta:"Check tasks • water • study • training"},
{id:"sleep",time:"22:30",title:"Sleep",meta:"Target bedtime"}];
const V5K="roundOneV5Routine",V5C="roundOneV5CustomTasks";
const v5day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const v5load=()=>{try{return JSON.parse(localStorage.getItem(V5K)||"{}")}catch(e){return{}}};
const v5save=x=>localStorage.setItem(V5K,JSON.stringify(x));
const v5custom=()=>{try{return JSON.parse(localStorage.getItem(V5C)||"[]")}catch(e){return[]}};
const v5esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function v5render(){const h=document.getElementById("dailyPlanList");if(!h)return;const s=v5load(),d=v5day(),done=new Set(s[d]||[]),items=[...V5_ROUTINE,...v5custom()].sort((a,b)=>a.time.localeCompare(b.time));h.innerHTML=items.map(x=>`<div class="plan-row ${done.has(x.id)?"completed":""}"><div class="plan-time">${x.time}</div><div><div class="plan-title">${v5esc(x.title)}</div><span class="plan-meta">${v5esc(x.meta||"")}</span></div><button class="plan-check" type="button" data-v5-task="${v5esc(x.id)}">${done.has(x.id)?"✓":"○"}</button></div>`).join("");h.querySelectorAll("[data-v5-task]").forEach(b=>b.onclick=()=>v5toggle(b.dataset.v5Task));const p=items.length?Math.round(done.size/items.length*100):0;const o=document.getElementById("routineCompletion");if(o)o.textContent=p+"%"}
function v5toggle(id){const s=v5load(),d=v5day(),set=new Set(s[d]||[]);set.has(id)?set.delete(id):set.add(id);s[d]=[...set];v5save(s);v5render()}
function v5reset(){const s=v5load();delete s[v5day()];v5save(s);v5render()}
function v5add(){const t=document.getElementById("customTaskTitle"),tm=document.getElementById("customTaskTime");if(!t||!t.value.trim())return;const a=v5custom();a.push({id:"custom-"+Date.now(),time:tm.value||"12:00",title:t.value.trim(),meta:"Custom task"});localStorage.setItem(V5C,JSON.stringify(a));t.value="";tm.value="";v5render()}
document.getElementById("addCustomTaskBtn")?.addEventListener("click",v5add);
document.getElementById("resetRoutineBtn")?.addEventListener("click",()=>{if(confirm("Reset today's routine checklist?"))v5reset()});
v5render();

/* Attractive hero progress sync */
(function(){
  function updateHero(){
    const el=document.getElementById("heroProgress");
    if(!el) return;
    try{
      const state=JSON.parse(localStorage.getItem("roundOneV5Routine")||"{}");
      const day=new Date().toISOString().slice(0,10);
      const completed=(state[day]||[]).length;
      const total=16 + (JSON.parse(localStorage.getItem("roundOneV5CustomTasks")||"[]").length);
      el.textContent=Math.min(100,Math.round(completed/Math.max(1,total)*100))+"%";
      const ring=document.querySelector(".hero-ring");
      if(ring){
        const deg=Math.min(360,Math.round(completed/Math.max(1,total)*360));
        ring.style.background=`radial-gradient(circle at center,#121611 61%,transparent 62%),conic-gradient(var(--gold) ${deg}deg,rgba(224,169,59,.12) ${deg}deg)`;
      }
    }catch(e){}
  }
  updateHero();
  setInterval(updateHero,1000);
})();

/* ==========================================================
   ROUND ONE FINAL v6
   Weekly analytics, local-date correctness, smart reminder UI,
   notification permission, and final dashboard.
========================================================== */
const V6_LOCAL_KEY = "roundOneFinalV6";
const V6_REMINDERS_KEY = "roundOneFinalV6Reminders";

function localDayKey(date = new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function v6LoadReminders(){
  try {
    const saved = JSON.parse(localStorage.getItem(V6_REMINDERS_KEY) || "null");
    if (saved && typeof saved === "object") return saved;
  } catch {}
  return {};
}
function v6SaveReminders(x){ localStorage.setItem(V6_REMINDERS_KEY, JSON.stringify(x)); }

function v6Schedule(){
  return [
    ["06:00","Wake Up","Start the day • no social media"],
    ["06:15","Morning Water","350–400 ml"],
    ["06:30","Morning Routine","Kadipatta • Moringa • Bhringraj • Isabgol • freshen up"],
    ["07:15","Deep Study #1","50 min focused study"],
    ["08:15","Breakfast","Breakfast + water"],
    ["08:45","Deep Study #2","50 min focused study"],
    ["10:00","College","College / commute block"],
    ["13:00","Lunch","Proper meal + short break"],
    ["16:30","Water Check","Hydration check"],
    ["19:00","Home & Recovery","Change • snack • hydrate • decompress"],
    ["19:30","Evening Study","50 min focused study"],
    ["20:30","Training Preparation","Light snack • hydrate • change"],
    ["21:00","Boxing","60 min target"],
    ["22:00","Cool Down & Wind Down","Shower • skincare • prepare tomorrow"],
    ["22:20","ROUND ONE Daily Review","Check tasks • water • study • training"],
    ["22:30","Sleep","Target bedtime"]
  ];
}

function v6ReminderRender(){
  const host = document.getElementById("reminderList");
  if(!host) return;
  const saved = v6LoadReminders();
  const defaults = v6Schedule();
  host.innerHTML = defaults.map(([time,title,meta],i)=>{
    const id = "v6-" + i;
    const on = saved[id] !== false;
    return `<div class="reminder-row">
      <div class="reminder-time">${time}</div>
      <div><div class="reminder-title">${v6Escape(title)}</div><span class="reminder-meta">${v6Escape(meta)}</span></div>
      <button type="button" class="reminder-toggle ${on?"on":""}" data-reminder="${id}" aria-label="Toggle ${v6Escape(title)}" aria-pressed="${on}"></button>
    </div>`;
  }).join("");
  host.querySelectorAll("[data-reminder]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const s=v6LoadReminders();
      const id=btn.dataset.reminder;
      s[id] = s[id] === false;
      v6SaveReminders(s);
      v6ReminderRender();
      showToast(s[id] ? "Reminder turned on" : "Reminder turned off");
    });
  });
}
function v6Escape(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function v6GetDay(date){
  const key = `routine:${localDayKey(date)}`;
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    return d || {completed:{},water:0,extra:[]};
  } catch { return {completed:{},water:0,extra:[]}; }
}
function v6GetPersonalDay(date){
  const key = localDayKey(date);
  try {
    const s = JSON.parse(localStorage.getItem("roundOneV5Routine") || "{}");
    const completed = Array.isArray(s[key]) ? s[key].length : 0;
    return completed;
  } catch { return 0; }
}
function v6DayMetrics(date){
  const d = v6GetDay(date);
  const base = BASE_SCHEDULE.length + (Array.isArray(d.extra)?d.extra.length:0);
  const done = Object.values(d.completed||{}).filter(Boolean).length;
  const personal = v6GetPersonalDay(date);
  const routineTotal = 16;
  const routineDone = Math.min(personal, routineTotal);
  const completion = Math.min(100, Math.round(((done + routineDone) / Math.max(1,base+routineTotal)) * 100));
  const water = Number(d.water||0);
  const study = Object.keys(d.completed||{}).filter(id => id.includes("study")).length;
  const boxing = Object.keys(d.completed||{}).filter(id => id.includes("boxing")).length;
  return {completion,water,study,boxing};
}
function v6CurrentStreak(){
  let streak=0;
  const d=new Date();
  for(let i=0;i<365;i++){
    const m=v6DayMetrics(d);
    if(m.completion<70 || m.water<WATER_GOAL_ML) break;
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function v6WeekRender(){
  const scoreEl=document.getElementById("weekScore");
  const streakEl=document.getElementById("weekStreak");
  const waterEl=document.getElementById("weekWater");
  const studyEl=document.getElementById("weekStudy");
  const boxingEl=document.getElementById("weekBoxing");
  const tasksEl=document.getElementById("weekTasks");
  const chart=document.getElementById("weekChart");
  if(!scoreEl || !chart) return;

  let totalScore=0, water=0, study=0, boxing=0;
  const days=[];
  const now=new Date();

  for(let i=6;i>=0;i--){
    const d=new Date(now);
    d.setHours(0,0,0,0);
    d.setDate(now.getDate()-i);
    const m=v6DayMetrics(d);
    days.push({d,m});
    totalScore+=m.completion;
    water+=m.water;
    study+=m.study;
    boxing+=m.boxing;
  }

  const score=Math.round(totalScore/7);
  scoreEl.textContent=score+"%";
  streakEl.textContent=v6CurrentStreak()+" days";
  waterEl.textContent=(water/1000).toFixed(1)+" L";
  studyEl.textContent=study+" blocks";
  boxingEl.textContent=boxing+" sessions";
  tasksEl.textContent=score+"%";

  const msg = score>=85 ? "Excellent consistency. Keep the momentum." :
              score>=70 ? "Strong week. One more push." :
              score>=50 ? "Good start. Build consistency." :
              "Reset, refocus, go again.";
  const msgEl=document.getElementById("weekMessage");
  if(msgEl) msgEl.textContent=msg;

  chart.innerHTML=days.map(({d,m})=>{
    const label=d.toLocaleDateString(undefined,{weekday:"short"}).slice(0,2);
    return `<div class="day-bar" title="${d.toLocaleDateString()} — ${m.completion}%">
      <div class="day-bar-track"><div class="day-bar-fill" style="height:${Math.max(3,m.completion)}%"></div></div>
      <b>${m.completion}%</b><small>${label}</small>
    </div>`;
  }).join("");
}

function v6NotificationStatus(){
  const box=document.getElementById("notificationStatus");
  const btn=document.getElementById("enableNotificationsFinal");
  if(!box) return;
  let text="Notifications are not supported in this browser.";
  let cls="warn";
  if("Notification" in window){
    if(Notification.permission==="granted"){
      text="iPhone notifications are allowed for ROUND ONE.";
      cls="ok";
      if(btn) btn.textContent="Notifications Enabled";
    }else if(Notification.permission==="denied"){
      text="Notifications are blocked. Enable them in iPhone Settings → Notifications → ROUND ONE.";
      cls="warn";
      if(btn) btn.textContent="Open Notification Help";
    }else{
      text="Notifications are ready — tap the button to allow them.";
      cls="";
      if(btn) btn.textContent="Enable iPhone Notifications";
    }
  }
  box.innerHTML=`<span class="status-dot ${cls}"></span><strong>${v6Escape(text)}</strong>`;
}

async function v6EnableNotifications(){
  if(!("Notification" in window)){
    showToast("Notifications are not supported here");
    v6NotificationStatus();
    return;
  }
  try{
    const p=await Notification.requestPermission();
    if(p==="granted"){
      try{
        new Notification("ROUND ONE",{
          body:"Notifications are enabled. Your routine is ready.",
          icon:"icon-192.png",
          tag:"round-one-enabled"
        });
      }catch{}
      showToast("Notifications enabled");
    }else{
      showToast(p==="denied" ? "Notifications blocked — check iPhone Settings" : "Permission not granted");
    }
  }catch{
    showToast("Could not request notification permission");
  }
  v6NotificationStatus();
}

document.getElementById("enableNotificationsFinal")?.addEventListener("click",v6EnableNotifications);
document.getElementById("refreshWeekBtn")?.addEventListener("click",()=>{v6WeekRender();showToast("Weekly dashboard refreshed")});

v6ReminderRender();
v6WeekRender();
v6NotificationStatus();

const finalSections=[
  ["weeklySection",document.querySelector('[data-target="weeklySection"]')],
  ["remindersSection",document.querySelector('[data-target="remindersSection"]')]
].filter(([,el])=>el);
if("IntersectionObserver" in window){
  const finalObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    const b=document.querySelector(`[data-target="${visible.target.id}"]`);
    if(b)document.querySelectorAll(".mobile-nav-item").forEach(x=>x.classList.toggle("active",x===b));
  },{threshold:[.25,.5,.75]});
  finalSections.forEach(([id])=>{const s=document.getElementById(id);if(s)finalObserver.observe(s)});
}
setInterval(()=>{v6WeekRender();v6NotificationStatus()},60000);
