# ContextFocus ⚡

> Blocks distractions automatically the moment you open a work tab. No timers. No setup. No buttons.

---

## How It Works

1. You open Notion, GitHub, Google Docs, Figma — or any of 30+ work tools
2. ContextFocus detects you're working
3. YouTube, Reddit, Twitter, and 12 more sites are instantly blocked
4. Close your work tab → focus mode turns off automatically

**No configuration needed. Just install and start working.**

---

## Install

### Chrome (Load Unpacked — Free)
1. Download `contextfocus.zip` from [Releases](../../releases)
2. Unzip the folder
3. Open Chrome → go to `chrome://extensions`
4. Enable **Developer Mode** (toggle in top right)
5. Click **Load unpacked** → select the unzipped `contextfocus` folder
6. Pin the extension to your toolbar

### Firefox
[Coming soon on Firefox Add-ons.](https://addons.mozilla.org/en-GB/firefox/addon/context-focus/)

---

## Features

- **Auto-detection** — recognizes 30+ work tools including Notion, GitHub, Figma, Google Workspace, Linear, Jira, Trello, Asana, Miro, Zoom, Slack, and more
- **Instant blocking** — blocks YouTube, Reddit, Twitter, TikTok, Netflix, Twitch and 9 more out of the box
- **Sweeps open tabs** — if YouTube is already open when you start working, it gets blocked too
- **Live focus timer** — see exactly how long you've been in the zone
- **3 modes** — Auto (recommended), Manual, or Off
- **Override with friction** — 10-second delay before you can bypass a block
- **Customizable** — add/remove any blocked site, add your own work domains
- **Tracks your time** — daily and all-time focus stats
- **Zero data collected** — everything stored locally, no account, no servers

---

## Screenshots

| Popup | Blocked Page |
|---|---|
| <img width="1280" height="800" alt="screenshot_1_popup" src="https://github.com/user-attachments/assets/aea0baab-274a-4381-92d1-a5422cb8a8d4" />
 | <img width="1280" height="800" alt="screenshot_2_blocked" src="https://github.com/user-attachments/assets/ac4641a5-581b-4b6e-88bd-15573a399130" />
 |

---

## File Structure

```
contextfocus/
├── manifest.json          # Extension config (Manifest V3)
├── background.js          # Service worker — detection + blocking logic
├── content.js             # DOM signal detection on pages
├── blocked.html           # Page shown when a site is blocked
├── blocked.js             # Logic for the blocked page
├── popup/
│   ├── popup.html         # Toolbar popup UI
│   └── popup.js           # Popup logic
├── options/
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions Used

| Permission | Why |
|---|---|
| `tabs` | Monitor which tabs are open to detect work context |
| `webNavigation` | Intercept navigation to blocked sites |
| `storage` | Save your settings and stats locally |
| `scripting` | Run content script to detect work signals on pages |
| `alarms` | Track focus time every minute |

No external network requests. No data leaves your browser. Ever.

---

## Detected Work Tools

Notion • GitHub • GitLab • Google Docs • Google Sheets • Google Slides • Gmail • Figma • Linear • Jira • Confluence • Trello • Asana • ClickUp • Monday • Miro • Canva • Slack • Zoom • VS Code Web • CodePen • Replit • Basecamp • Substack • WordPress • SharePoint • OneDrive • Office.com

**Plus:** add any custom domain in Settings for your company's internal tools.

---

## Roadmap

- [ ] Firefox Add-ons store release
- [ ] Weekly focus reports
- [ ] Scheduled focus sessions (auto-block 9am–12pm daily)
- [ ] Focus streaks and goals
- [ ] Team dashboard for companies

---

## Support This Project

If ContextFocus saves you even 30 minutes of distraction per week, consider buying me a coffee ☕

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com)

---

## License

MIT — free to use, modify, and distribute.

---

*Built by [@shivampersonal22](https://github.com/shivampersonal22)*
