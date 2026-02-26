// ContextFocus — Options Page Script

const DEFAULT_BLOCKED = [
  "youtube.com","reddit.com","twitter.com","x.com","facebook.com",
  "instagram.com","tiktok.com","netflix.com","twitch.tv","hulu.com",
  "disneyplus.com","9gag.com","buzzfeed.com","tumblr.com","pinterest.com"
];

let settings = {};

async function init() {
  const stored = await chrome.storage.local.get("settings");
  settings = stored.settings || {};

  // Render toggles
  renderToggle("toggleAutoDetect", settings.mode !== "off");
  renderToggle("toggleStrict", !!settings.strictMode);
  renderToggle("toggleMotivation", settings.showMotivation !== false);

  // Goal slider
  const slider = document.getElementById("goalSlider");
  slider.value = settings.dailyGoalMinutes || 120;
  updateGoalDisplay(slider.value);
  slider.addEventListener("input", () => updateGoalDisplay(slider.value));

  // Lists
  renderBlockedList();
  renderWorkDomainList();

  // Toggle buttons via data-setting
  document.querySelectorAll(".toggle[data-setting]").forEach(el => {
    el.addEventListener("click", () => toggleSetting(el.dataset.setting));
  });

  // Add buttons
  document.getElementById("addBlockedBtn").addEventListener("click", addBlockedSite);
  document.getElementById("addWorkDomainBtn").addEventListener("click", addWorkDomain);

  // Enter key
  document.getElementById("newBlockedSite").addEventListener("keydown", e => {
    if (e.key === "Enter") addBlockedSite();
  });
  document.getElementById("newWorkDomain").addEventListener("keydown", e => {
    if (e.key === "Enter") addWorkDomain();
  });

  // Reset / restore / save
  document.getElementById("resetStatsBtn").addEventListener("click", resetStats);
  document.getElementById("restoreDefaultsBtn").addEventListener("click", restoreDefaults);
  document.getElementById("saveBtn").addEventListener("click", saveSettings);
}

function renderToggle(id, on) {
  const el = document.getElementById(id);
  if (on) el.classList.add("on");
  else el.classList.remove("on");
}

function toggleSetting(key) {
  if (key === "autoDetect") {
    settings.mode = settings.mode !== "off" ? "off" : "auto";
    renderToggle("toggleAutoDetect", settings.mode !== "off");
  } else {
    settings[key] = !settings[key];
    renderToggle(
      key === "strictMode" ? "toggleStrict" : "toggleMotivation",
      !!settings[key]
    );
  }
}

function updateGoalDisplay(val) {
  val = parseInt(val);
  const h = Math.floor(val / 60);
  const m = val % 60;
  document.getElementById("goalVal").textContent =
    h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── BLOCKED SITES ────────────────────────────────────────────────────────────

function renderBlockedList() {
  const list = settings.blockedSites || DEFAULT_BLOCKED;
  const container = document.getElementById("blockedList");
  container.innerHTML = "";

  list.forEach(site => {
    const tag = document.createElement("div");
    tag.className = "site-tag";
    tag.innerHTML = `<span>${site}</span><span class="remove" data-remove="${site}">×</span>`;
    container.appendChild(tag);
  });

  // Event delegation for remove buttons
  container.onclick = (e) => {
    const target = e.target.closest("[data-remove]");
    if (target) removeBlocked(target.dataset.remove);
  };
}

function addBlockedSite() {
  const input = document.getElementById("newBlockedSite");
  let val = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  if (!val || !val.includes(".")) return;

  if (!settings.blockedSites) settings.blockedSites = [...DEFAULT_BLOCKED];
  if (!settings.blockedSites.includes(val)) {
    settings.blockedSites.push(val);
    renderBlockedList();
    markUnsaved();
  }
  input.value = "";
}

function removeBlocked(site) {
  if (!settings.blockedSites) settings.blockedSites = [...DEFAULT_BLOCKED];
  settings.blockedSites = settings.blockedSites.filter(s => s !== site);
  renderBlockedList();
  markUnsaved();
}

// ─── WORK DOMAINS ─────────────────────────────────────────────────────────────

function renderWorkDomainList() {
  const list = settings.workDomains || [];
  const container = document.getElementById("workDomainList");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<span style="font-size:11px;color:var(--muted)">No custom domains added yet.</span>`;
    return;
  }

  list.forEach(domain => {
    const tag = document.createElement("div");
    tag.className = "site-tag custom";
    tag.innerHTML = `<span>${domain}</span><span class="remove" data-remove-domain="${domain}">×</span>`;
    container.appendChild(tag);
  });

  // Event delegation for remove buttons
  container.onclick = (e) => {
    const target = e.target.closest("[data-remove-domain]");
    if (target) removeWorkDomain(target.dataset.removeDomain);
  };
}

function addWorkDomain() {
  const input = document.getElementById("newWorkDomain");
  let val = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  if (!val || !val.includes(".")) return;

  if (!settings.workDomains) settings.workDomains = [];
  if (!settings.workDomains.includes(val)) {
    settings.workDomains.push(val);
    renderWorkDomainList();
    markUnsaved();
  }
  input.value = "";
}

function removeWorkDomain(domain) {
  settings.workDomains = (settings.workDomains || []).filter(d => d !== domain);
  renderWorkDomainList();
  markUnsaved();
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

async function saveSettings() {
  settings.dailyGoalMinutes = parseInt(document.getElementById("goalSlider").value);
  await chrome.storage.local.set({ settings });
  showSaved();
}

function markUnsaved() {
  const el = document.getElementById("saveStatus");
  el.textContent = "Unsaved changes";
  el.classList.remove("saved");
}

function showSaved() {
  const el = document.getElementById("saveStatus");
  el.textContent = "✓ Saved";
  el.classList.add("saved");
  setTimeout(() => {
    el.textContent = "All changes saved automatically";
    el.classList.remove("saved");
  }, 2000);
}

// ─── RESET ────────────────────────────────────────────────────────────────────

async function resetStats() {
  if (!confirm("Reset all focus stats? This cannot be undone.")) return;
  await chrome.storage.local.set({
    stats: { totalMinutes: 0, streakDays: 0, lastActiveDate: null, sessionsToday: 0 }
  });
  alert("Stats reset.");
}

async function restoreDefaults() {
  if (!confirm("Restore default blocked sites list?")) return;
  settings.blockedSites = [...DEFAULT_BLOCKED];
  renderBlockedList();
  markUnsaved();
}

document.addEventListener("DOMContentLoaded", init);
