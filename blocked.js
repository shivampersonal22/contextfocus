// ContextFocus — Blocked Page Script (external, CSP-safe)

const QUOTES = [
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell" },
  { text: "The ability to focus attention on important things is a defining characteristic of intelligence.", author: "Robert J. Shiller" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "Your focus needs more focus.", author: "Mr. Han" },
  { text: "One reason so few of us achieve what we truly want is that we never direct our focus.", author: "Tony Robbins" },
  { text: "The key to success is to focus our conscious mind on things we desire, not things we fear.", author: "Brian Tracy" },
];

document.addEventListener("DOMContentLoaded", () => {
  // Parse query params
  const params = new URLSearchParams(location.search);
  const site = params.get("site") || "this site";
  const returnUrl = params.get("returnUrl");

  // Populate site name
  document.getElementById("siteName").textContent = site;

  // Random quote
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quoteText").textContent = `"${q.text}"`;
  document.getElementById("quoteAuthor").textContent = `— ${q.author}`;

  // Get session time from background
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (chrome.runtime.lastError) return;
    if (state?.sessionMinutes !== undefined) {
      const mins = state.sessionMinutes;
      document.getElementById("sessionTime").textContent =
        mins < 1 ? "just started" : `${mins} min${mins !== 1 ? "s" : ""}`;
    }
  });

  // Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    history.back();
    setTimeout(() => window.close(), 300);
  });

  // Override button
  let overrideStarted = false;
  document.getElementById("overrideBtn").addEventListener("click", () => {
    if (overrideStarted) return;
    overrideStarted = true;

    const btn = document.getElementById("overrideBtn");
    const countdown = document.getElementById("countdown");
    const countNum = document.getElementById("countdownNum");
    const fill = document.getElementById("progressFill");

    btn.style.display = "none";
    countdown.style.display = "block";

    let secs = 10;
    countNum.textContent = secs;

    const interval = setInterval(() => {
      secs--;
      countNum.textContent = secs;
      fill.style.width = `${((10 - secs) / 10) * 100}%`;

      if (secs <= 0) {
        clearInterval(interval);
        if (returnUrl) {
          chrome.runtime.sendMessage({ type: "FORCE_OFF" }, () => {
            window.location.href = decodeURIComponent(returnUrl);
          });
        }
      }
    }, 1000);
  });
});
