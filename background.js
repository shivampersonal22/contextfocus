// ContextFocus — Background Service Worker
// The brain: monitors tabs, detects work context, enforces blocking

// ─── DEFAULTS ────────────────────────────────────────────────────────────────

const DEFAULT_BLOCKED_SITES = [
  "youtube.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "netflix.com",
  "twitch.tv",
  "hulu.com",
  "disneyplus.com",
  "9gag.com",
  "buzzfeed.com",
  "tumblr.com",
  "pinterest.com"
];

const WORK_CONTEXTS = [
  // Google Workspace
  { domain: "docs.google.com", label: "Google Docs" },
  { domain: "sheets.google.com", label: "Google Sheets" },
  { domain: "slides.google.com", label: "Google Slides" },
  { domain: "mail.google.com", label: "Gmail" },
  { domain: "calendar.google.com", label: "Google Calendar" },
  // Productivity
  { domain: "notion.so", label: "Notion" },
  { domain: "notion.site", label: "Notion" },
  { domain: "linear.app", label: "Linear" },
  { domain: "trello.com", label: "Trello" },
  { domain: "asana.com", label: "Asana" },
  { domain: "monday.com", label: "Monday" },
  { domain: "clickup.com", label: "ClickUp" },
  { domain: "basecamp.com", label: "Basecamp" },
  // Dev tools
  { domain: "github.com", label: "GitHub" },
  { domain: "gitlab.com", label: "GitLab" },
  { domain: "vscode.dev", label: "VS Code Web" },
  { domain: "codepen.io", label: "CodePen" },
  { domain: "codesandbox.io", label: "CodeSandbox" },
  { domain: "replit.com", label: "Replit" },
  { domain: "stackblitz.com", label: "StackBlitz" },
  // Design
  { domain: "figma.com", label: "Figma" },
  { domain: "miro.com", label: "Miro" },
  { domain: "canva.com", label: "Canva" },
  // Writing
  { domain: "medium.com/new-story", label: "Medium" },
  { domain: "substack.com", label: "Substack" },
  { domain: "wordpress.com", label: "WordPress" },
  // Communication (work)
  { domain: "slack.com", label: "Slack" },
  { domain: "app.slack.com", label: "Slack" },
  { domain: "teams.microsoft.com", label: "Teams" },
  { domain: "zoom.us", label: "Zoom" },
  // Cloud / docs
  { domain: "dropbox.com", label: "Dropbox" },
  { domain: "sharepoint.com", label: "SharePoint" },
  { domain: "confluence.atlassian.com", label: "Confluence" },
  { domain: "jira.atlassian.com", label: "Jira" },
  // Office
  { domain: "office.com", label: "Microsoft Office" },
  { domain: "onedrive.live.com", label: "OneDrive" }
];

// Work-indicating keywords found in tab title
const WORK_TITLE_KEYWORDS = [
  "- notion", "| notion",
  "google docs", "google sheets", "google slides",
  "figma", "linear", "jira", "confluence",
  "pull request", "merge request", "commit",
  "readme", "dashboard", "report", "proposal",
  "invoice", "budget", "meeting notes", "agenda"
];

// ─── STATE ────────────────────────────────────────────────────────────────────

let focusState = {
  active: false,
  mode: "auto",          // "auto" | "manual"
  reason: null,          // what triggered it
  activeSince: null,
  focusMinutesToday: 0,
  sessionMinutes: 0,
  workTabId: null
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) {
    await chrome.storage.local.set({
      settings: {
        blockedSites: DEFAULT_BLOCKED_SITES,
        workDomains: [],          // user-added custom work domains
        mode: "auto",             // "auto" | "manual" | "off"
        strictMode: false,        // prevent manual disable during focus
        showMotivation: true,
        dailyGoalMinutes: 120
      },
      stats: {
        totalMinutes: 0,
        streakDays: 0,
        lastActiveDate: null,
        sessionsToday: 0
      }
    });
  }

  // Setup recurring alarm for stats tracking
  chrome.alarms.create("statsTracker", { periodInMinutes: 1 });
  chrome.alarms.create("dailyReset", { periodInMinutes: 60 });
});

// ─── ALARM HANDLER ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "statsTracker" && focusState.active) {
    focusState.sessionMinutes += 1;
    focusState.focusMinutesToday += 1;

    // Persist stats
    const { stats } = await chrome.storage.local.get("stats");
    stats.totalMinutes = (stats.totalMinutes || 0) + 1;
    await chrome.storage.local.set({ stats });
    updateBadge();
  }

  if (alarm.name === "dailyReset") {
    const today = new Date().toDateString();
    const { stats } = await chrome.storage.local.get("stats");
    if (stats.lastActiveDate !== today) {
      focusState.focusMinutesToday = 0;
    }
  }
});

// ─── TAB MONITORING ───────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab) await evaluateContext(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.title) {
    await evaluateContext(tab);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === focusState.workTabId) {
    // Work tab closed — check if any other work tabs open
    const allTabs = await chrome.tabs.query({});
    const stillWorking = allTabs.some(t => isWorkContext(t.url, t.title));
    if (!stillWorking && focusState.mode === "auto") {
      await deactivateFocus("work tab closed");
    }
  }
});

// ─── NAVIGATION BLOCKING ──────────────────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // top frame only
  if (!focusState.active) return;

  const { settings } = await chrome.storage.local.get("settings");
  const blocked = [...(settings.blockedSites || [])];

  try {
    const url = new URL(details.url);
    const hostname = url.hostname.replace("www.", "");
    const isBlocked = blocked.some(site =>
      hostname === site || hostname.endsWith("." + site)
    );

    if (isBlocked) {
      const blockedPage = chrome.runtime.getURL("blocked.html") +
        `?site=${encodeURIComponent(hostname)}&returnUrl=${encodeURIComponent(details.url)}`;
      await chrome.tabs.update(details.tabId, { url: blockedPage });
    }
  } catch (e) {}
});

// ─── CONTEXT EVALUATION ───────────────────────────────────────────────────────

async function evaluateContext(tab) {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) return;
  if (settings.mode === "off") return;
  if (settings.mode === "manual") return; // user controls manually

  const working = isWorkContext(tab.url, tab.title, [
    ...WORK_CONTEXTS,
    ...(settings.workDomains || []).map(d => ({ domain: d, label: "Custom" }))
  ]);

  if (working && !focusState.active) {
    focusState.workTabId = tab.id;
    await activateFocus(tab.title || tab.url);
  }
}

function isWorkContext(url, title, contexts = WORK_CONTEXTS) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.replace("www.", "");

    // Domain match
    const domainMatch = contexts.some(ctx => {
      const ctxDomain = ctx.domain.replace("www.", "");
      return hostname === ctxDomain || hostname.endsWith("." + ctxDomain);
    });
    if (domainMatch) return true;

    // Title keyword match
    const titleLower = (title || "").toLowerCase();
    const titleMatch = WORK_TITLE_KEYWORDS.some(kw => titleLower.includes(kw));
    if (titleMatch) return true;

  } catch (e) {}
  return false;
}

// ─── FOCUS ACTIVATION / DEACTIVATION ─────────────────────────────────────────

async function activateFocus(reason) {
  focusState.active = true;
  focusState.activeSince = Date.now();
  focusState.sessionMinutes = 0;
  focusState.reason = reason;

  const { stats } = await chrome.storage.local.get("stats");
  const today = new Date().toDateString();
  stats.sessionsToday = (stats.lastActiveDate === today)
    ? (stats.sessionsToday || 0) + 1
    : 1;
  stats.lastActiveDate = today;
  await chrome.storage.local.set({ stats });

  updateBadge(true);
  notifyPopup({ type: "FOCUS_CHANGED", active: true, reason });
  console.log("[ContextFocus] Focus ON —", reason);

  // ── Sweep all already-open tabs and block any distraction sites ──
  await sweepExistingTabs();
}

// Checks every open tab right now and redirects any blocked-site tabs
async function sweepExistingTabs() {
  const { settings } = await chrome.storage.local.get("settings");
  const blocked = settings?.blockedSites || [];
  const allTabs = await chrome.tabs.query({});

  for (const tab of allTabs) {
    if (!tab.url || !tab.id) continue;
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname.replace("www.", "");
      const isBlocked = blocked.some(site =>
        hostname === site || hostname.endsWith("." + site)
      );
      if (isBlocked) {
        const blockedPage = chrome.runtime.getURL("blocked.html") +
          `?site=${encodeURIComponent(hostname)}&returnUrl=${encodeURIComponent(tab.url)}`;
        await chrome.tabs.update(tab.id, { url: blockedPage });
      }
    } catch (e) {}
  }
}

async function deactivateFocus(reason = "manual") {
  focusState.active = false;
  focusState.activeSince = null;
  focusState.workTabId = null;
  focusState.reason = null;

  updateBadge(false);
  notifyPopup({ type: "FOCUS_CHANGED", active: false, reason });
  console.log("[ContextFocus] Focus OFF —", reason);
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

function updateBadge(active) {
  if (active === undefined) active = focusState.active;
  chrome.action.setBadgeText({ text: active ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({
    color: active ? "#22c55e" : "#6b7280"
  });
}

// ─── MESSAGE BUS ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse);
  return true; // keep channel open for async
});

async function handleMessage(msg, sender) {
  switch (msg.type) {
    case "GET_STATE": {
      const { settings, stats } = await chrome.storage.local.get(["settings", "stats"]);
      return {
        ...focusState,
        settings,
        stats,
        uptime: focusState.activeSince
          ? Math.floor((Date.now() - focusState.activeSince) / 1000)
          : 0
      };
    }

    case "TOGGLE_FOCUS": {
      if (focusState.active) {
        await deactivateFocus("manual");
      } else {
        await activateFocus("manual override");
      }
      return { active: focusState.active };
    }

    case "FORCE_OFF": {
      await deactivateFocus("force");
      return { ok: true };
    }

    case "UPDATE_SETTINGS": {
      const { settings } = await chrome.storage.local.get("settings");
      const updated = { ...settings, ...msg.settings };
      await chrome.storage.local.set({ settings: updated });
      return { ok: true };
    }

    case "WORK_CONTEXT_DETECTED": {
      // From content.js
      if (!focusState.active) {
        await activateFocus(msg.label || "content signal");
      }
      return { ok: true };
    }

    case "GET_BLOCKED_LIST": {
      const { settings } = await chrome.storage.local.get("settings");
      return { sites: settings?.blockedSites || DEFAULT_BLOCKED_SITES };
    }
  }
}

// ─── POPUP RELAY ──────────────────────────────────────────────────────────────

function notifyPopup(data) {
  chrome.runtime.sendMessage(data).catch(() => {}); // popup may not be open
}

// Init badge on startup
updateBadge(false);
