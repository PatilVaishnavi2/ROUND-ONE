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
