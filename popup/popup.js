// ContextFocus — Popup Script

let state = null;
let uptimeInterval = null;
let localUptime = 0;
let blockedCount = 0;

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  loadState();
  setupListeners();
}

async function loadState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response) return;
    state = response;
    localUptime = response.uptime || 0;
    renderState();
    startUptimeTick();
    renderBlockedSites();
    renderStats();
    renderMode();
  });
}

function setupListeners() {
  // Listen for changes from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "FOCUS_CHANGED") {
      loadState();
    }
  });

  document.getElementById("settingsBtn").addEventListener("click", openOptions);
  document.getElementById("mainToggle").addEventListener("click", toggleFocus);
  document.getElementById("manageListsBtn").addEventListener("click", openOptions);

  // Mode pills
  document.querySelectorAll(".mode-pill").forEach(pill => {
    pill.addEventListener("click", () => setMode(pill.dataset.mode));
  });
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderState() {
  const card = document.getElementById("statusCard");
  const toggle = document.getElementById("mainToggle");
  const label = document.getElementById("statusLabel");
  const main = document.getElementById("statusMain");
  const sub = document.getElementById("statusSub");
  const timerDisplay = document.getElementById("timerDisplay");

  const active = state?.active;

  if (active) {
    card.classList.add("active");
    toggle.classList.add("on");
    label.textContent = "Focus Active";
    main.textContent = "In the zone.";

    const reason = state.reason || "work context detected";
    const truncated = reason.length > 40 ? reason.slice(0, 37) + "..." : reason;
    sub.innerHTML = `Triggered by <strong>${truncated}</strong>`;

    timerDisplay.style.display = "flex";

    // Show context reason in footer
    const ctx = document.getElementById("contextReason");
    ctx.textContent = "";
  } else {
    card.classList.remove("active");
    toggle.classList.remove("on");
    label.textContent = "Monitoring";
    main.textContent = "Watching...";
    sub.textContent = "Open a work tab to activate automatically.";
    timerDisplay.style.display = "none";
  }

  updateTimer();
}

function renderMode() {
  const mode = state?.settings?.mode || "auto";
  document.querySelectorAll(".mode-pill").forEach(p => p.classList.remove("active"));
  const modeMap = { auto: "modeAuto", manual: "modeManual", off: "modeOff" };
  const el = document.getElementById(modeMap[mode]);
  if (el) el.classList.add("active");
}

function renderStats() {
  const stats = state?.stats || {};
  const settings = state?.settings || {};

  const todayMins = state?.focusMinutesToday || 0;
  const totalMins = stats.totalMinutes || 0;
  const goalMins = settings.dailyGoalMinutes || 120;

  document.getElementById("statToday").textContent =
    todayMins >= 60
      ? `${Math.floor(todayMins/60)}h ${todayMins%60}m`
      : `${todayMins}m`;

  document.getElementById("statTotal").textContent =
    totalMins >= 60
      ? `${Math.floor(totalMins/60)}h`
      : `${totalMins}m`;
}

function renderBlockedSites() {
  chrome.runtime.sendMessage({ type: "GET_BLOCKED_LIST" }, ({ sites }) => {
    if (!sites) return;
    blockedCount = sites.length;

    document.getElementById("blockedCount").textContent = `${sites.length} sites`;

    const container = document.getElementById("siteChips");
    container.innerHTML = "";

    const show = sites.slice(0, 6);
    show.forEach(site => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = site.replace("www.", "");
      container.appendChild(chip);
    });

    if (sites.length > 6) {
      const more = document.createElement("div");
      more.className = "chip more";
      more.textContent = `+${sites.length - 6} more`;
      more.onclick = openOptions;
      container.appendChild(more);
    }
  });
}

// ─── TIMER ────────────────────────────────────────────────────────────────────

function startUptimeTick() {
  if (uptimeInterval) clearInterval(uptimeInterval);
  if (!state?.active) return;

  uptimeInterval = setInterval(() => {
    localUptime += 1;
    updateTimer();
  }, 1000);
}

function updateTimer() {
  if (!state?.active) return;

  const mins = Math.floor(localUptime / 60);
  const secs = localUptime % 60;

  document.getElementById("timerMins").textContent = String(mins).padStart(2, "0");
  document.getElementById("timerSecs").textContent = String(secs).padStart(2, "0");
  document.getElementById("timerBlocked").textContent = blockedCount;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

function toggleFocus() {
  chrome.runtime.sendMessage({ type: "TOGGLE_FOCUS" }, () => {
    loadState();
  });
}

function setMode(mode) {
  chrome.runtime.sendMessage({
    type: "UPDATE_SETTINGS",
    settings: { mode }
  }, () => {
    loadState();
  });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

// ─── START ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
