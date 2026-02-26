// ContextFocus — Content Script
// Sniffs the page for work-context signals beyond just URL/title

(function () {
  // Don't run on chrome:// or extension pages
  if (!location.href.startsWith("http")) return;

  // Work signals from DOM — look for rich text editors, code editors, etc.
  const WORK_SIGNALS = [
    // Google Docs
    { selector: ".docs-editor", label: "Google Docs" },
    { selector: ".docs-spreadsheet-container", label: "Google Sheets" },
    { selector: ".punch-present-iframe", label: "Google Slides" },
    // Notion
    { selector: ".notion-page-content", label: "Notion" },
    { selector: '[data-block-id]', label: "Notion" },
    // Code editors
    { selector: ".monaco-editor", label: "Code Editor" },
    { selector: ".CodeMirror", label: "Code Editor" },
    { selector: ".ace_editor", label: "Code Editor" },
    // GitHub
    { selector: ".js-blob-code-container", label: "GitHub Code" },
    { selector: "#new_pull_request", label: "GitHub PR" },
    // Figma
    { selector: "canvas.gpu-canvas", label: "Figma" },
    // Generic rich text / writing
    { selector: '[contenteditable="true"][role="textbox"]', label: "Rich Editor" },
    { selector: ".ql-editor", label: "Quill Editor" },
    { selector: ".ProseMirror", label: "ProseMirror Editor" },
    { selector: "trix-editor", label: "Trix Editor" },
  ];

  function detectWorkSignals() {
    for (const signal of WORK_SIGNALS) {
      try {
        if (document.querySelector(signal.selector)) {
          chrome.runtime.sendMessage({
            type: "WORK_CONTEXT_DETECTED",
            label: signal.label,
            url: location.href,
            title: document.title
          }).catch(() => {});
          return;
        }
      } catch (e) {}
    }
  }

  // Run on load
  if (document.readyState === "complete") {
    detectWorkSignals();
  } else {
    window.addEventListener("load", detectWorkSignals);
  }

  // Also observe DOM mutations for SPAs that render after load
  const observer = new MutationObserver(() => {
    detectWorkSignals();
  });

  // Only observe for 10s after load to avoid overhead
  setTimeout(() => observer.disconnect(), 10000);

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: false
  });
})();
