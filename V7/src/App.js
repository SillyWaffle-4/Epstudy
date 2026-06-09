import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const STORAGE_KEY = "epstudy_secure_pro_v7";
const LEGACY_STORAGE_KEY = "epstudy_secure_pro_v6";
const EPSTUDY_VERSION = "v7-react";
const EPS_PERIODS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const PAGES = ["dashboard", "tasks", "calendar", "timer", "cosmetics", "help", "settings"];
const DEFAULT_WIDGETS = {
  today: true,
  timer: true,
  schedule: true,
  periods: false,
  calendar: true,
  tasks: true
};
const DEFAULT_COURSES = [
  { id: "course-personal", name: "Personal", code: "PERS", color: "#8b5cf6" },
  { id: "course-sports", name: "Team Event", code: "TEAM", color: "#10b981" }
];
const QUOTES = [
  ["Small choices compound into finished work.", "EPStudy"],
  ["Start before it feels urgent.", "EPStudy"],
  ["Make the next right task obvious, then do it.", "EPStudy"],
  ["Preparation is quieter than panic and usually faster.", "EPStudy"]
];
const TOUR_STEPS = [
  {
    page: "dashboard",
    target: "nav-dashboard",
    title: "Start on Dashboard",
    body: "Dashboard is the quick daily view: open work, the timer, schedule awareness, calendar, and the short task queue."
  },
  {
    page: "dashboard",
    target: "today",
    title: "Check Today First",
    body: "Today shows the most useful next tasks. Mark something done here or open the full Tasks page when you need the longer list."
  },
  {
    page: "dashboard",
    target: "timer",
    title: "Use the Focus Timer",
    body: "Start a focused session from Dashboard or open the Timer page to pick a task and custom duration."
  },
  {
    page: "dashboard",
    target: "calendar",
    title: "Scan the Week",
    body: "Next 7 Days gives a fast workload preview. The full Calendar page shows the whole month with non-month days grayed out."
  },
  {
    page: "settings",
    target: "sync",
    title: "Sync from Settings",
    body: "Settings controls Canvas, TeamSnap, Membean, and source-opening buttons. The same extension install works with V6 and V7."
  },
  {
    page: "cosmetics",
    target: "cosmetics",
    title: "Personalize Lightly",
    body: "Cosmetics brings back some V6 personality without slowing V7 down. Secret codes unlock a few extra skins."
  }
];
const SKINS = [
  { id: "default", name: "Clean Sky", note: "Classic EPStudy calm.", className: "skin-default" },
  { id: "forest", name: "Forest", note: "Leafy greens and warm focus.", className: "skin-forest" },
  { id: "ocean", name: "Ocean", note: "Blue, bright, and steady.", className: "skin-ocean" },
  { id: "sunset", name: "Sunset", note: "Coral and gold study light.", className: "skin-sunset" },
  { id: "pixel", name: "Pixel Meadow", note: "A light 2D blocky wallpaper.", className: "skin-pixel" },
  { id: "cat", name: "Cat Night", note: "Unlocked with AARINI.", className: "skin-cat", secret: "aarini" },
  { id: "lightbulb", name: "Bright Idea", note: "Unlocked with GENIUS.", className: "skin-lightbulb", secret: "genius" }
];
const DEFAULT_UNLOCKED_SKINS = ["default", "forest", "ocean", "sunset", "pixel"];

function defaultState() {
  const now = new Date();
  return {
    tasks: [],
    courses: DEFAULT_COURSES,
    ignoredTaskKeys: [],
    foreverIgnoredTaskKeys: [],
    completedTaskKeys: [],
    scheduleEnabled: true,
    membeanEnabled: false,
    teamSnapEnabled: false,
    canvasDomain: "eastsideprep.instructure.com",
    dashboardWidgets: { ...DEFAULT_WIDGETS },
    epsSchedules: {},
    liveSchedule: null,
    extensionSync: { lastSyncAt: null, sources: {}, status: null, teamSnapLinks: [] },
    membeanProgress: { completedSessions: 0, requiredSessions: 3, minutesPerSession: 10, updatedAt: null },
    selectedSkin: "default",
    unlockedSkins: DEFAULT_UNLOCKED_SKINS,
    timerMinutes: 25,
    timerTaskId: "",
    currentPage: initialPage("dashboard"),
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth()
  };
}

function initialPage(fallback = "dashboard") {
  try {
    const page = new URLSearchParams(window.location.search).get("page");
    return PAGES.includes(page) ? page : fallback;
  } catch {
    return fallback;
  }
}

function loadState() {
  const base = defaultState();
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    const migrated = {
      ...base,
      ...parsed,
      currentPage: initialPage(PAGES.includes(parsed.currentPage) ? parsed.currentPage : "dashboard"),
      scheduleEnabled: typeof parsed.scheduleEnabled === "boolean" ? parsed.scheduleEnabled : true,
      membeanEnabled: Boolean(parsed.membeanEnabled),
      teamSnapEnabled: Boolean(parsed.teamSnapEnabled),
      canvasDomain: String(parsed.canvasDomain || parsed.canvas?.domain || base.canvasDomain),
      dashboardWidgets: { ...DEFAULT_WIDGETS, ...(parsed.dashboardWidgets || {}) },
      selectedSkin: skinById(parsed.selectedSkin) ? parsed.selectedSkin : "default",
      unlockedSkins: normalizeUnlockedSkins(parsed.unlockedSkins),
      membeanProgress: normalizeMembeanProgress(parsed.membeanProgress),
      tasks: normalizeTasks(parsed.tasks || []),
      courses: normalizeCourses(parsed.courses || DEFAULT_COURSES),
      epsSchedules: parsed.epsSchedules && typeof parsed.epsSchedules === "object" ? parsed.epsSchedules : {},
      extensionSync: parsed.extensionSync && typeof parsed.extensionSync === "object" ? { ...base.extensionSync, ...parsed.extensionSync } : base.extensionSync
    };
    if (!localStorage.getItem(STORAGE_KEY)) migrated.dashboardWidgets.periods = false;
    return migrated;
  } catch {
    return base;
  }
}

function normalizeUnlockedSkins(value) {
  const ids = new Set(DEFAULT_UNLOCKED_SKINS);
  (Array.isArray(value) ? value : []).forEach(id => {
    if (skinById(id)) ids.add(String(id));
  });
  return Array.from(ids);
}

function skinById(id) {
  return SKINS.find(skin => skin.id === String(id || ""));
}

function normalizeMembeanProgress(value) {
  const completed = Math.max(0, Number(value?.completedSessions || value?.completed || 0));
  const required = Math.max(1, Number(value?.requiredSessions || value?.required || 3));
  const minutes = Math.max(1, Number(value?.minutesPerSession || value?.minutes || 10));
  return {
    completedSessions: Math.min(completed, required),
    requiredSessions: required,
    minutesPerSession: minutes,
    updatedAt: value?.updatedAt || null
  };
}

function normalizeCourses(courses) {
  const seen = new Set();
  const rows = (Array.isArray(courses) ? courses : [])
    .map((course, index) => {
      const id = String(course?.id || `course-${index}`).trim();
      const name = String(course?.name || `Course ${index + 1}`).replace(/\s+/g, " ").trim();
      if (!id || !name || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        name,
        code: String(course?.code || course?.course_code || "").replace(/\s+/g, " ").trim(),
        period: normalizePeriod(course?.period || course?.course_period || course?.section || ""),
        color: validColor(course?.color) ? course.color : colorFromString(name),
        hidden: Boolean(course?.hidden),
        source: String(course?.source || "")
      };
    })
    .filter(Boolean);
  for (const course of DEFAULT_COURSES) {
    if (!rows.some(row => row.id === course.id)) rows.push(course);
  }
  return rows;
}

function normalizeTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => {
      const due = parseDate(task?.dueDate || task?.due_at || task?.start_at || task?.date);
      return {
        ...task,
        id: String(task?.id || `task-${index}-${Date.now()}`),
        title: cleanTitle(task?.title || task?.name || "Untitled task"),
        source: String(task?.source || "manual").toLowerCase(),
        courseId: String(task?.courseId || task?.course_id || ""),
        rawCanvasCourseId: String(task?.rawCanvasCourseId || ""),
        dueDate: due ? due.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        estimatedMinutes: Math.max(1, Number(task?.estimatedMinutes || task?.minutes || 25)),
        completed: Boolean(task?.completed)
      };
    })
    .filter(task => task.title)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizePeriod(value) {
  const match = String(value || "").toUpperCase().match(/\b(?:PERIOD\s*)?([A-H])\b/);
  return match ? match[1] : "";
}

function cleanTitle(value) {
  return String(value || "").replace(/^Assignment\b:?\s*/i, "").replace(/\s+/g, " ").trim();
}

function validColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || ""));
}

function colorFromString(value) {
  let hash = 0;
  for (let i = 0; i < String(value).length; i += 1) hash = (hash * 31 + String(value).charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 56% 42%)`;
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dueLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " " + timeLabel(date);
}

function taskKey(task) {
  return String(task?.externalKey || `${task?.source || "manual"}:${task?.id || task?.title || ""}`).toLowerCase();
}

function canvasCourseId(id) {
  const raw = String(id || "");
  if (raw.startsWith("canvas-course-")) return raw;
  return /^\d+$/.test(raw) ? `canvas-course-${raw}` : raw;
}

function App() {
  const [state, setState] = useState(loadState);
  const [syncing, setSyncing] = useState(false);
  const [tourStep, setTourStep] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(() => state.timerMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    window.history.replaceState({ page: state.currentPage }, "", `?page=${state.currentPage}`);
  }, []);

  useEffect(() => {
    const skin = skinById(state.selectedSkin) || skinById("default");
    document.body.classList.remove(...SKINS.map(item => item.className));
    if (skin?.className) document.body.classList.add(skin.className);
  }, [state.selectedSkin]);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, epstudyVersion: EPSTUDY_VERSION }));
    }, 120);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  useEffect(() => {
    const id = setTimeout(() => {
      window.postMessage({
        type: "EPSTUDY_WEBSITE_TASKS",
        tasks: state.tasks,
        ignoredTaskKeys: state.foreverIgnoredTaskKeys || [],
        websiteVersion: "normal"
      }, bridgeTargetOrigin());
    }, 220);
    return () => clearTimeout(id);
  }, [state.tasks, state.foreverIgnoredTaskKeys]);

  useEffect(() => {
    function onMessage(event) {
      if (event.source !== window || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "EPSTUDY_EXTENSION_SYNC") {
        setSyncing(false);
        setState(prev => applyExtensionPayload(prev, event.data.payload || {}));
      }
      if (event.data.type === "EPSTUDY_EXTENSION_STATUS") setSyncing(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!state.scheduleEnabled) return undefined;
    fetchLiveSchedule(setState);
    const scheduleTimer = setInterval(() => fetchLiveSchedule(setState), 10 * 60 * 1000);
    return () => clearInterval(scheduleTimer);
  }, [state.scheduleEnabled]);

  useEffect(() => {
    if (!state.scheduleEnabled) return;
    const periodCount = new Set(state.courses.map(course => course.period).filter(Boolean)).size;
    if (periodCount < 7) requestExtensionSync();
  }, []);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => {
      setTimerSeconds(current => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const coursesById = useMemo(() => Object.fromEntries(state.courses.map(course => [course.id, course])), [state.courses]);
  const visibleTasks = useMemo(() => state.tasks.filter(task => !state.foreverIgnoredTaskKeys.includes(taskKey(task))), [state.tasks, state.foreverIgnoredTaskKeys]);
  const openTasks = useMemo(() => visibleTasks.filter(task => !task.completed), [visibleTasks]);
  const todayTasks = useMemo(() => openTasks.filter(task => dateKey(task.dueDate) === dateKey(new Date())).slice(0, 6), [openTasks]);
  const weekTasks = useMemo(() => tasksInNextDays(openTasks, 7), [openTasks]);
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);
  const activeTour = tourStep === null ? null : TOUR_STEPS[tourStep] || null;

  function navigate(page) {
    const next = PAGES.includes(page) ? page : "dashboard";
    setState(prev => ({ ...prev, currentPage: next }));
    window.history.pushState({ page: next }, "", `?page=${next}`);
  }

  function updateState(patch) {
    setState(prev => ({ ...prev, ...patch }));
  }

  function requestExtensionSync() {
    setSyncing(true);
    window.postMessage({
      type: "EPSTUDY_EXTENSION_REQUEST_SYNC",
      config: {
        canvasDomain: state.canvasDomain,
        membeanEnabled: Boolean(state.membeanEnabled),
        teamSnapEnabled: Boolean(state.teamSnapEnabled),
        scheduleEnabled: Boolean(state.scheduleEnabled)
      }
    }, bridgeTargetOrigin());
    setTimeout(() => setSyncing(false), 18000);
  }

  function openSource(source) {
    window.postMessage({ type: "EPSTUDY_OPEN_SOURCE", source }, bridgeTargetOrigin());
  }

  function submitConfigCode(code) {
    const value = String(code || "").trim().toLowerCase();
    if (!value) return;
    if (value === "simple") {
      window.location.href = "../V6/simple.html";
      return;
    }
    if (value === "normal" || value === "v6") {
      window.location.href = "../V6/index.html";
      return;
    }
    if (value === "v7") {
      navigate("dashboard");
      return;
    }
    if (value === "aarini") {
      unlockSkin("cat", "cosmetics");
      return;
    }
    if (value === "genius") {
      unlockSkin("lightbulb", "cosmetics");
    }
  }

  function unlockSkin(id, page = state.currentPage) {
    setState(prev => ({
      ...prev,
      currentPage: page,
      selectedSkin: id,
      unlockedSkins: Array.from(new Set([...(prev.unlockedSkins || DEFAULT_UNLOCKED_SKINS), id]))
    }));
  }

  function selectSkin(id) {
    setState(prev => {
      const unlocked = normalizeUnlockedSkins(prev.unlockedSkins);
      if (!unlocked.includes(id)) return prev;
      return { ...prev, selectedSkin: id, unlockedSkins: unlocked };
    });
  }

  function toggleTask(taskId) {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task)
    }));
  }

  function ignoreTask(taskId) {
    setState(prev => {
      const task = prev.tasks.find(row => row.id === taskId);
      if (!task) return prev;
      return {
        ...prev,
        foreverIgnoredTaskKeys: Array.from(new Set([...(prev.foreverIgnoredTaskKeys || []), taskKey(task)]))
      };
    });
  }

  function setWidget(id, visible) {
    setState(prev => ({ ...prev, dashboardWidgets: { ...prev.dashboardWidgets, [id]: visible } }));
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerSeconds(state.timerMinutes * 60);
  }

  function startTour() {
    setTourStep(0);
    navigate(TOUR_STEPS[0].page);
  }

  function moveTour(delta) {
    setTourStep(current => {
      if (current === null) return current;
      const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, current + delta));
      navigate(TOUR_STEPS[next].page);
      return next;
    });
  }

  function closeTour() {
    setTourStep(null);
  }

  return html`
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="./shared/logo.png" alt="EPStudy" />
          <span>EPStudy <strong>V7</strong></span>
        </div>
        ${PAGES.map(page => html`
          <button className=${`nav-button ${state.currentPage === page ? "active" : ""} ${activeTour?.target === `nav-${page}` ? "tour-highlight" : ""}`} onClick=${() => navigate(page)}>
            ${pageLabel(page)}
          </button>
        `)}
        <button className="sync-button" disabled=${syncing} onClick=${requestExtensionSync}>${syncing ? "Syncing..." : "Sync"}</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">React workspace</p>
            <h1>${pageLabel(state.currentPage)}</h1>
          </div>
          <div className="top-stats">
            <span><strong>${openTasks.length}</strong> open</span>
            <span><strong>${state.courses.filter(c => c.period).length}</strong> periods</span>
            <span><strong>${state.extensionSync.lastSyncAt ? "Live" : "Local"}</strong> sync</span>
          </div>
        </header>

        ${state.currentPage === "dashboard" && html`
          <${Dashboard}
            state=${state}
            coursesById=${coursesById}
            todayTasks=${todayTasks}
            weekTasks=${weekTasks}
            quote=${quote}
            toggleTask=${toggleTask}
            setWidget=${setWidget}
            timerSeconds=${timerSeconds}
            timerRunning=${timerRunning}
            setTimerRunning=${setTimerRunning}
            resetTimer=${resetTimer}
            navigate=${navigate}
            tourTarget=${activeTour?.target}
          />
        `}
        ${state.currentPage === "tasks" && html`<${TasksPage} tasks=${visibleTasks} coursesById=${coursesById} toggleTask=${toggleTask} ignoreTask=${ignoreTask} />`}
        ${state.currentPage === "calendar" && html`<${CalendarPage} state=${state} tasks=${openTasks} updateState=${updateState} />`}
        ${state.currentPage === "timer" && html`
          <${TimerPage}
            state=${state}
            tasks=${openTasks}
            timerSeconds=${timerSeconds}
            timerRunning=${timerRunning}
            setTimerSeconds=${setTimerSeconds}
            setTimerRunning=${setTimerRunning}
            resetTimer=${resetTimer}
            updateState=${updateState}
          />
        `}
        ${state.currentPage === "cosmetics" && html`
          <${CosmeticsPage} state=${state} selectSkin=${selectSkin} tourTarget=${activeTour?.target} />
        `}
        ${state.currentPage === "help" && html`
          <${HelpPage} navigate=${navigate} startTour=${startTour} requestExtensionSync=${requestExtensionSync} syncing=${syncing} />
        `}
        ${state.currentPage === "settings" && html`
          <${SettingsPage}
            state=${state}
            updateState=${updateState}
            setWidget=${setWidget}
            requestExtensionSync=${requestExtensionSync}
            openSource=${openSource}
            submitConfigCode=${submitConfigCode}
            tourTarget=${activeTour?.target}
            syncing=${syncing}
          />
        `}
      </main>
      ${activeTour && html`
        <${TourOverlay}
          step=${tourStep}
          total=${TOUR_STEPS.length}
          item=${activeTour}
          next=${() => moveTour(1)}
          previous=${() => moveTour(-1)}
          close=${closeTour}
        />
      `}
    </div>
  `;
}

function Dashboard({ state, coursesById, todayTasks, weekTasks, quote, toggleTask, setWidget, timerSeconds, timerRunning, setTimerRunning, resetTimer, navigate, tourTarget }) {
  const widgets = state.dashboardWidgets || DEFAULT_WIDGETS;
  return html`
    <section className="dashboard-grid">
      ${widgets.today && html`
        <article className=${`panel wide ${tourTarget === "today" ? "tour-highlight" : ""}`}>
          <div className="panel-title"><h2>Today</h2><button onClick=${() => navigate("tasks")}>Tasks</button></div>
          <${TaskStack} tasks=${todayTasks.length ? todayTasks : weekTasks.slice(0, 5)} coursesById=${coursesById} toggleTask=${toggleTask} compact=${true} />
        </article>
      `}
      ${widgets.timer && html`
        <article className=${`panel ${tourTarget === "timer" ? "tour-highlight" : ""}`}>
          <h2>Focus Timer</h2>
          <div className="timer">${formatTimer(timerSeconds)}</div>
          <div className="button-row">
            <button className="primary" onClick=${() => setTimerRunning(!timerRunning)}>${timerRunning ? "Pause" : "Start"}</button>
            <button onClick=${resetTimer}>Reset</button>
          </div>
        </article>
      `}
      ${widgets.schedule && html`<${ScheduleWidget} state=${state} />`}
      ${(state.membeanEnabled || state.membeanProgress?.updatedAt) && html`<${MembeanWidget} progress=${state.membeanProgress} />`}
      ${widgets.periods && html`<${PeriodsWidget} courses=${state.courses} schedule=${todaysSchedule(state)} />`}
      ${widgets.calendar && html`
        <article className=${`panel full ${tourTarget === "calendar" ? "tour-highlight" : ""}`}>
          <div className="panel-title"><h2>Next 7 Days</h2><button onClick=${() => navigate("calendar")}>Calendar</button></div>
          <${WeekStrip} tasks=${weekTasks} />
        </article>
      `}
      ${widgets.tasks && html`
        <article className="panel">
          <h2>Quick Queue</h2>
          <${TaskStack} tasks=${weekTasks.slice(0, 4)} coursesById=${coursesById} toggleTask=${toggleTask} compact=${true} />
        </article>
      `}
      <article className="panel quote">
        <p>“${quote[0]}”</p>
        <span>${quote[1]}</span>
      </article>
    </section>
  `;
}

function MembeanWidget({ progress }) {
  const data = normalizeMembeanProgress(progress);
  const pct = Math.min(100, Math.round((data.completedSessions / data.requiredSessions) * 100));
  return html`
    <article className="panel">
      <h2>Membean</h2>
      <p className="big-line">${data.completedSessions}/${data.requiredSessions} sessions</p>
      <div className="progress-track"><span style=${{ width: `${pct}%` }} /></div>
      <p className="muted">${data.minutesPerSession}+ minutes each${data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleDateString()}` : ""}</p>
    </article>
  `;
}

function ScheduleWidget({ state }) {
  if (!state.scheduleEnabled) return html`<article className="panel"><h2>Schedule</h2><p className="empty">Schedule is off.</p></article>`;
  const blocks = scheduleBlocks(todaysSchedule(state));
  const now = new Date();
  const current = blocks.find(block => nowMinutes(now) >= minutes(block.start) && nowMinutes(now) < minutes(block.end));
  const next = blocks.find(block => nowMinutes(now) < minutes(block.start));
  return html`
    <article className="panel">
      <h2>Schedule</h2>
      <p className="big-line">${current ? current.label : next ? `Next: ${next.label}` : "Schedule complete"}</p>
      <p className="muted">${current ? `${current.displayStart || current.start} - ${current.displayEnd || current.end}` : next ? `${next.displayStart || next.start}` : "No active block"}</p>
      <div className="mini-list">
        ${blocks.slice(0, 6).map(block => html`<span>${block.displayStart || block.start} · ${block.label}</span>`)}
      </div>
    </article>
  `;
}

function PeriodsWidget({ courses, schedule }) {
  const byPeriod = new Map();
  courses.filter(course => !course.hidden && course.period).forEach(course => {
    if (!byPeriod.has(course.period)) byPeriod.set(course.period, []);
    byPeriod.get(course.period).push(course);
  });
  const liveLetters = scheduleBlocks(schedule).flatMap(block => periodLetters(block.label).map(letter => ({ letter, block })));
  const rows = liveLetters.length ? liveLetters : EPS_PERIODS.map(letter => ({ letter, block: null }));
  const seen = new Set();
  return html`
    <article className="panel">
      <h2>Periods</h2>
      <div className="period-list">
        ${rows.map(({ letter, block }) => {
          const key = `${letter}-${block?.start || ""}`;
          if (seen.has(key)) return null;
          seen.add(key);
          const course = (byPeriod.get(letter) || [])[0];
          return html`
            <div className="period-row">
              <b>${letter}</b>
              <span>${course?.name || "No course yet"}<small>${course?.code || "Sync Canvas or set this in Settings"}</small></span>
              <em>${block ? (block.displayStart || block.start) : ""}</em>
            </div>
          `;
        })}
      </div>
    </article>
  `;
}

function TasksPage({ tasks, coursesById, toggleTask, ignoreTask }) {
  const [query, setQuery] = useState("");
  const filtered = tasks.filter(task => `${task.title} ${coursesById[task.courseId]?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  return html`
    <section className="panel full-page">
      <div className="panel-title">
        <h2>Tasks</h2>
        <input value=${query} onInput=${event => setQuery(event.target.value)} placeholder="Search tasks" />
      </div>
      <${TaskStack} tasks=${filtered} coursesById=${coursesById} toggleTask=${toggleTask} ignoreTask=${ignoreTask} />
    </section>
  `;
}

function TaskStack({ tasks, coursesById, toggleTask, ignoreTask, compact = false }) {
  if (!tasks.length) return html`<p className="empty">Nothing due here.</p>`;
  return html`
    <div className=${compact ? "task-stack compact" : "task-stack"}>
      ${tasks.map(task => {
        const course = coursesById[task.courseId] || coursesById[canvasCourseId(task.rawCanvasCourseId)] || null;
        return html`
          <div className=${`task-row ${task.completed ? "done" : ""}`} key=${task.id}>
            <button className="check" onClick=${() => toggleTask(task.id)}>${task.completed ? "✓" : ""}</button>
            <span className="task-main">
              <strong>${task.title}</strong>
              <small>${course?.name || task.courseName || "Unfiltered"} · ${dueLabel(task.dueDate)}</small>
            </span>
            ${ignoreTask && html`<button className="ghost" onClick=${() => ignoreTask(task.id)}>Ignore</button>`}
          </div>
        `;
      })}
    </div>
  `;
}

function CalendarPage({ state, tasks, updateState }) {
  const first = new Date(state.calendarYear, state.calendarMonth, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return html`
    <section className="panel full-page">
      <div className="panel-title">
        <h2>${first.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
        <div className="button-row">
          <button onClick=${() => shiftMonth(state, updateState, -1)}>Prev</button>
          <button onClick=${() => shiftMonth(state, updateState, 1)}>Next</button>
        </div>
      </div>
      <div className="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => html`<b>${day}</b>`)}
        ${days.map(day => {
          const key = dateKey(day);
          const dayTasks = tasks.filter(task => dateKey(task.dueDate) === key);
          const muted = day.getMonth() !== state.calendarMonth;
          const today = key === dateKey(new Date());
          return html`
            <div className=${`calendar-cell ${muted ? "muted-cell" : ""} ${today ? "today" : ""}`}>
              <strong>${day.getDate()}</strong>
              ${dayTasks.slice(0, 3).map(task => html`<span>${task.title}</span>`)}
            </div>
          `;
        })}
      </div>
    </section>
  `;
}

function TimerPage({ state, tasks, timerSeconds, timerRunning, setTimerSeconds, setTimerRunning, resetTimer, updateState }) {
  return html`
    <section className="panel full-page timer-page">
      <h2>Focus Timer</h2>
      <div className="timer hero-timer">${formatTimer(timerSeconds)}</div>
      <div className="button-row center">
        <button className="primary" onClick=${() => setTimerRunning(!timerRunning)}>${timerRunning ? "Pause" : "Start"}</button>
        <button onClick=${resetTimer}>Reset</button>
      </div>
      <label className="setting-row">
        Duration
        <input type="number" min="1" max="180" value=${state.timerMinutes} onInput=${event => {
          const minutes = Math.max(1, Math.min(180, Number(event.target.value) || 25));
          updateState({ timerMinutes: minutes });
          setTimerSeconds(minutes * 60);
        }} />
      </label>
      <label className="setting-row">
        Focus task
        <select value=${state.timerTaskId} onChange=${event => updateState({ timerTaskId: event.target.value })}>
          <option value="">No task selected</option>
          ${tasks.map(task => html`<option value=${task.id}>${task.title}</option>`)}
        </select>
      </label>
    </section>
  `;
}

function SettingsPage({ state, updateState, setWidget, requestExtensionSync, openSource, submitConfigCode, tourTarget, syncing }) {
  const [configCode, setConfigCode] = useState("");
  return html`
    <section className="settings-grid">
      <article className=${`panel ${tourTarget === "sync" ? "tour-highlight" : ""}`}>
        <h2>Sync</h2>
        <label className="setting-row">Canvas domain<input value=${state.canvasDomain} onInput=${event => updateState({ canvasDomain: event.target.value })} /></label>
        <label className="check-row"><input type="checkbox" checked=${state.scheduleEnabled} onChange=${event => updateState({ scheduleEnabled: event.target.checked })} /> Show schedule</label>
        <label className="check-row"><input type="checkbox" checked=${state.membeanEnabled} onChange=${event => updateState({ membeanEnabled: event.target.checked })} /> Membean</label>
        <label className="check-row"><input type="checkbox" checked=${state.teamSnapEnabled} onChange=${event => updateState({ teamSnapEnabled: event.target.checked })} /> TeamSnap</label>
        <button className="primary" disabled=${syncing} onClick=${requestExtensionSync}>${syncing ? "Syncing..." : "Sync now"}</button>
        <div className="button-row">
          <button onClick=${() => openSource("canvas")}>Canvas</button>
          <button onClick=${() => openSource("teamsnap")}>TeamSnap</button>
          <button onClick=${() => openSource("membean")}>Membean</button>
        </div>
      </article>
      <article className="panel">
        <h2>Dashboard widgets</h2>
        ${Object.entries(DEFAULT_WIDGETS).map(([id]) => html`
          <label className="check-row">
            <input type="checkbox" checked=${state.dashboardWidgets[id] !== false} onChange=${event => setWidget(id, event.target.checked)} />
            ${widgetLabel(id)}
          </label>
        `)}
        <p className="muted">Periods are hidden by default in V7. Turn them on here when your Canvas periods are synced.</p>
      </article>
      <article className="panel wide">
        <h2>Courses</h2>
        <div className="course-grid">
          ${state.courses.filter(course => !course.hidden).map(course => html`
            <div className="course-pill">
              <span style=${{ background: course.color }}></span>
              <strong>${course.name}</strong>
              <small>${course.period ? `Period ${course.period}` : "No period"}</small>
            </div>
          `)}
        </div>
      </article>
      <article className="panel">
        <h2>Config codes</h2>
        <form className="config-row" onSubmit=${event => {
          event.preventDefault();
          submitConfigCode(configCode);
          setConfigCode("");
        }}>
          <input value=${configCode} onInput=${event => setConfigCode(event.target.value)} placeholder="Code" />
          <button className="primary" type="submit">Submit</button>
        </form>
        <p className="muted">Try NORMAL, SIMPLE, V7, AARINI, or GENIUS.</p>
      </article>
    </section>
  `;
}

function CosmeticsPage({ state, selectSkin, tourTarget }) {
  const unlocked = normalizeUnlockedSkins(state.unlockedSkins);
  return html`
    <section className=${`panel full-page ${tourTarget === "cosmetics" ? "tour-highlight" : ""}`}>
      <div className="panel-title">
        <h2>Cosmetics</h2>
        <span className="muted">${unlocked.length}/${SKINS.length} unlocked</span>
      </div>
      <div className="skin-grid">
        ${SKINS.map(skin => {
          const locked = !unlocked.includes(skin.id);
          return html`
            <button
              className=${`skin-card ${skin.className} ${state.selectedSkin === skin.id ? "selected" : ""} ${locked ? "locked" : ""}`}
              disabled=${locked}
              onClick=${() => selectSkin(skin.id)}
            >
              <strong>${skin.name}</strong>
              <span>${locked ? "Locked" : skin.note}</span>
            </button>
          `;
        })}
      </div>
    </section>
  `;
}

function HelpPage({ navigate, startTour, requestExtensionSync, syncing }) {
  return html`
    <section className="help-layout">
      <article className="panel full-page help-hero">
        <p className="eyebrow">Help Center</p>
        <h2>Find the feature you need without digging.</h2>
        <p className="muted">Short guides for setup, syncing, privacy, and the daily workflow. The visual walkthrough is intentionally short.</p>
        <div className="button-row">
          <button className="primary" onClick=${startTour}>Start visual walkthrough</button>
          <a className="button-link" href="https://chromewebstore.google.com/detail/epstudy-sync/glajcaifhmapabedfnjhclalmnmklldb?hl=en-US&utm_source=ext_sidebar" target="_blank" rel="noopener noreferrer">Download extension</a>
        </div>
      </article>
      <article className="panel help-card">
        <h2>Start Here</h2>
        <p>Sync once, check Dashboard, then use the timer for the first task that actually matters today.</p>
        <button onClick=${startTour}>Open walkthrough</button>
      </article>
      <article className="panel help-card">
        <h2>Sync Setup</h2>
        <p>One extension install can feed V6 and V7. Keep EPStudy open and use signed-in Canvas, TeamSnap, and Membean tabs.</p>
        <div className="button-row">
          <button disabled=${syncing} onClick=${requestExtensionSync}>${syncing ? "Syncing..." : "Sync now"}</button>
          <button onClick=${() => navigate("settings")}>Settings</button>
        </div>
      </article>
      <article className="panel help-card">
        <h2>Tasks</h2>
        <p>Checking a task marks it complete locally and publishes that state to the shared extension cache.</p>
        <button onClick=${() => navigate("tasks")}>Open Tasks</button>
      </article>
      <article className="panel help-card">
        <h2>Calendar</h2>
        <p>The calendar shows due dates by month. Tiles outside the current month are muted so today is easier to spot.</p>
        <button onClick=${() => navigate("calendar")}>Open Calendar</button>
      </article>
      <article className="panel help-card">
        <h2>Cosmetics</h2>
        <p>V7 has a lighter version of V6 skins. Config codes can unlock small secret themes without slowing the app down.</p>
        <button onClick=${() => navigate("cosmetics")}>Open Cosmetics</button>
      </article>
      <article className="panel full-page help-steps">
        <h2>Recommended Setup</h2>
        <ol>
          <li><strong>Open Settings.</strong><span>Enable Schedule, Membean, or TeamSnap only if you use them.</span></li>
          <li><strong>Run Sync.</strong><span>Let the extension read Canvas first, then optional sources.</span></li>
          <li><strong>Check Dashboard.</strong><span>Use Today and Next 7 Days before opening the full list.</span></li>
          <li><strong>Start a timer.</strong><span>Pick one task, focus, then mark it done when the work is genuinely complete.</span></li>
        </ol>
      </article>
    </section>
  `;
}

function TourOverlay({ step, total, item, next, previous, close }) {
  const last = step >= total - 1;
  return html`
    <div className="tour-scrim" role="dialog" aria-modal="true" aria-label="EPStudy walkthrough">
      <article className="tour-card">
        <p className="eyebrow">Guide step ${step + 1} of ${total}</p>
        <h2>${item.title}</h2>
        <p>${item.body}</p>
        <div className="tour-actions">
          <button onClick=${previous} disabled=${step === 0}>Previous</button>
          <button className="primary" onClick=${last ? close : next}>${last ? "Done" : "Next"}</button>
          <button className="ghost" onClick=${close}>Skip</button>
        </div>
      </article>
    </div>
  `;
}

function applyExtensionPayload(prev, payload) {
  const courses = upsertCourses(prev.courses, payload.courses || payload.canvasCourses || []);
  const tasks = upsertTasks(prev.tasks, [...(payload.canvas || []), ...(prev.teamSnapEnabled ? payload.teamsnap || [] : [])], courses);
  const membeanRows = Array.isArray(payload.membean) ? payload.membean : [];
  const membeanProgress = membeanRows.reduce((best, row) => {
    const progress = row?.progress || row || {};
    const completed = Number(progress.completedSessions || progress.completed || progress.sessionsCompleted || 0);
    if (completed < Number(best.completedSessions || 0)) return best;
    return normalizeMembeanProgress({
      completedSessions: completed,
      requiredSessions: progress.requiredSessions || progress.required || best.requiredSessions,
      minutesPerSession: progress.minutesPerSession || progress.minutes || best.minutesPerSession,
      updatedAt: payload.updatedAt || new Date().toISOString()
    });
  }, prev.membeanProgress || defaultState().membeanProgress);
  return {
    ...prev,
    courses,
    tasks,
    membeanProgress,
    extensionSync: {
      ...prev.extensionSync,
      status: payload.sourceStatus || prev.extensionSync.status,
      teamSnapLinks: payload.teamSnapLinks || prev.extensionSync.teamSnapLinks,
      lastSyncAt: payload.updatedAt || new Date().toISOString(),
      sources: {
        ...prev.extensionSync.sources,
        canvas: payload.canvas ? { total: payload.canvas.length, syncedAt: new Date().toISOString() } : prev.extensionSync.sources.canvas,
        teamsnap: payload.teamsnap ? { total: payload.teamsnap.length, syncedAt: new Date().toISOString() } : prev.extensionSync.sources.teamsnap,
        membean: membeanRows.length ? { total: membeanRows.length, syncedAt: new Date().toISOString() } : prev.extensionSync.sources.membean
      }
    }
  };
}

function upsertCourses(existing, incoming) {
  const byId = new Map(normalizeCourses(existing).map(course => [course.id, course]));
  for (const course of normalizeCourses(incoming)) {
    const id = canvasCourseId(course.id);
    const current = byId.get(id) || byId.get(course.id);
    byId.set(id, {
      ...current,
      ...course,
      id,
      period: course.period || current?.period || "",
      color: current?.color || course.color
    });
  }
  return Array.from(byId.values());
}

function upsertTasks(existing, incoming, courses) {
  const courseIds = new Set(courses.map(course => course.id));
  const byKey = new Map(normalizeTasks(existing).map(task => [taskKey(task), task]));
  for (const task of normalizeTasks(incoming)) {
    const normalizedCourse = canvasCourseId(task.courseId || task.rawCanvasCourseId);
    const current = byKey.get(taskKey(task));
    byKey.set(taskKey(task), {
      ...current,
      ...task,
      courseId: courseIds.has(normalizedCourse) ? normalizedCourse : task.courseId,
      completed: current?.completed || task.completed
    });
  }
  return Array.from(byKey.values()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

async function fetchLiveSchedule(setState) {
  const key = dateKey(new Date());
  try {
    const response = await fetch(`https://four11.eastsideprep.org/epsnet/schedule_for_date?date=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error("Schedule fetch failed");
    const schedule = await response.json();
    setState(prev => ({
      ...prev,
      liveSchedule: schedule,
      epsSchedules: { ...prev.epsSchedules, [key]: schedule }
    }));
  } catch {
    // V7 keeps the last saved schedule if EPSNet is unavailable.
  }
}

function todaysSchedule(state) {
  const key = dateKey(new Date());
  return state.epsSchedules?.[key] || (state.liveSchedule?.date === key ? state.liveSchedule : null);
}

function scheduleBlocks(schedule) {
  return (schedule?.periods || [])
    .map(period => {
      const [start, end] = String(period.times || "").split(/\s*-\s*/);
      return {
        label: period.period || period.label || "",
        start: to24(start),
        end: to24(end),
        displayStart: start || "",
        displayEnd: end || ""
      };
    })
    .filter(block => block.label && block.start && block.end);
}

function to24(value) {
  const raw = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutes(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
}

function nowMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function periodLetters(value) {
  const letters = [];
  const period = String(value || "").toUpperCase().match(/\bPERIOD\s*([A-H])\b/);
  if (period) letters.push(period[1]);
  for (const match of String(value || "").toUpperCase().matchAll(/\b([A-H])\b/g)) {
    if (!letters.includes(match[1])) letters.push(match[1]);
  }
  return letters;
}

function tasksInNextDays(tasks, days) {
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return tasks.filter(task => {
    const due = new Date(task.dueDate);
    return due >= startOfDay(now) && due < end;
  }).slice(0, 40);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function WeekStrip({ tasks }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index);
    return day;
  });
  return html`
    <div className="week-strip">
      ${days.map(day => {
        const dayTasks = tasks.filter(task => dateKey(task.dueDate) === dateKey(day));
        return html`
          <div>
            <strong>${day.toLocaleDateString([], { weekday: "short" })}</strong>
            <span>${day.getDate()}</span>
            <small>${dayTasks.length} item${dayTasks.length === 1 ? "" : "s"}</small>
          </div>
        `;
      })}
    </div>
  `;
}

function shiftMonth(state, updateState, offset) {
  const date = new Date(state.calendarYear, state.calendarMonth + offset, 1);
  updateState({ calendarYear: date.getFullYear(), calendarMonth: date.getMonth() });
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function pageLabel(page) {
  return ({ dashboard: "Dashboard", tasks: "Tasks", calendar: "Calendar", timer: "Timer", cosmetics: "Cosmetics", help: "Help", settings: "Settings" })[page] || "Dashboard";
}

function widgetLabel(id) {
  return ({ today: "Today", timer: "Timer", schedule: "Schedule", periods: "Periods", calendar: "Calendar", tasks: "Task queue" })[id] || id;
}

function bridgeTargetOrigin() {
  return window.location.origin === "null" || window.location.protocol === "file:" ? "*" : window.location.origin;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
