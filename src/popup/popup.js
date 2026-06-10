import { MSG } from "../shared/messages.js";
import { STORAGE_KEYS } from "../shared/constants.js";
import { logger } from "../shared/logger.js";

const SCOPE = "popup";

/** @type {HTMLElement | null} */
const popupRoot = document.getElementById("popup-root");
/** @type {HTMLElement | null} */
const appVersion = document.getElementById("app-version");
/** @type {HTMLElement | null} */
const viewMain = document.getElementById("view-main");
/** @type {HTMLElement | null} */
const viewReport = document.getElementById("view-report");
/** @type {HTMLElement | null} */
const statusTitle = document.getElementById("status-title");
/** @type {HTMLElement | null} */
const statusPillLabel = document.getElementById("status-pill-label");
/** @type {HTMLElement | null} */
const statusLede = document.getElementById("status-lede");
/** @type {HTMLElement | null} */
const connectionStatus = document.getElementById("connection-status");
/** @type {HTMLElement | null} */
const statBlocked = document.getElementById("stat-blocked");
/** @type {HTMLButtonElement | null} */
const toggleBtn = document.getElementById("toggle-btn");
/** @type {HTMLElement | null} */
const toggleLabel = document.getElementById("toggle-label");
/** @type {HTMLElement | null} */
const footnote = document.getElementById("footnote");
/** @type {HTMLElement | null} */
const reportMeta = document.getElementById("report-meta");
/** @type {HTMLElement | null} */
const reportTotal = document.getElementById("report-total");
/** @type {HTMLElement | null} */
const reportTableWrap = document.getElementById("report-table-wrap");
/** @type {HTMLElement | null} */
const reportList = document.getElementById("report-list");
/** @type {HTMLElement | null} */
const reportEmpty = document.getElementById("report-empty");
/** @type {HTMLButtonElement | null} */
const dismissReportBtn = document.getElementById("dismiss-report-btn");
/** @type {HTMLButtonElement | null} */
const openTestPageBtn = document.getElementById("open-test-page");

const COPY = Object.freeze({
  off: {
    title: "You're unprotected",
    lede: "One click silences notification popups and permission prompts across every open tab.",
    pill: "Off",
    cta: "Enter Focus Mode",
    footnote: "Deactivating shows a summary of blocked notifications by site.",
    banner: "Ready — protection applies to all open tabs",
  },
  on: {
    title: "Deep work protected",
    lede: "Notification popups and permission prompts are blocked on all tabs until you turn off focus.",
    pill: "On",
    cta: "Exit Focus Mode",
    footnote:
      "WebSockets and in-page messages still work — only OS notifications are silenced.",
    banner: "Focus active — notifications blocked on all tabs",
  },
});

/**
 * @param {number} ms
 */
function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

/**
 * @param {"main" | "report"} view
 */
function setView(view) {
  popupRoot?.setAttribute("data-view", view);
  if (viewMain) viewMain.hidden = view !== "main";
  if (viewReport) viewReport.hidden = view !== "report";
}

/**
 * @param {"ok" | "error" | "neutral"} variant
 * @param {string} text
 */
function setConnectionStatus(variant, text) {
  if (!connectionStatus) return;

  connectionStatus.classList.remove("is-ok", "is-error");
  if (variant === "ok") connectionStatus.classList.add("is-ok");
  if (variant === "error") connectionStatus.classList.add("is-error");

  const textEl = connectionStatus.querySelector(".connection-banner__text");
  if (textEl) textEl.textContent = text;
}

/**
 * @param {{ focusActive: boolean; sessionStartedAt: string | null }} state
 * @param {number} [blockedCount]
 */
function renderMainState(state, blockedCount = 0) {
  const mode = state.focusActive ? "on" : "off";
  const copy = COPY[mode];

  popupRoot?.setAttribute("data-focus", mode);

  if (statusTitle) statusTitle.textContent = copy.title;
  if (statusPillLabel) statusPillLabel.textContent = copy.pill;
  if (statusLede) statusLede.textContent = copy.lede;
  if (toggleLabel) toggleLabel.textContent = copy.cta;
  if (footnote) footnote.textContent = copy.footnote;

  if (statBlocked) {
    statBlocked.textContent = state.focusActive ? String(blockedCount) : "—";
  }

  setConnectionStatus("ok", copy.banner);
}

/**
 * @param {object | null | undefined} report
 */
function renderReport(report) {
  if (!report) {
    setView("main");
    return;
  }

  setView("report");

  if (reportMeta) {
    reportMeta.textContent = `Duration ${formatDuration(Number(report.durationMs) || 0)}`;
  }
  if (reportTotal) {
    reportTotal.textContent = String(report.totalBlocked ?? 0);
  }

  const rows = Array.isArray(report.byDomain) ? report.byDomain : [];
  const hasRows = rows.length > 0;

  if (reportTableWrap) reportTableWrap.hidden = !hasRows;
  if (reportEmpty) reportEmpty.hidden = hasRows;
  if (reportList) {
    reportList.replaceChildren();
    for (const row of rows.slice(0, 10)) {
      const li = document.createElement("li");
      li.className = "report__item";
      li.innerHTML = `<span class="report__domain">${row.domain}</span><span class="report__count">${row.count} · ${row.percent}%</span>`;
      reportList.appendChild(li);
    }
  }
}

/**
 * @param {object} payload
 */
function renderPayload(payload) {
  if (payload.state) {
    renderMainState(payload.state, payload.blockedCount ?? 0);
  }

  if (payload.reportPending && payload.lastReport) {
    renderReport(payload.lastReport);
    return;
  }

  if (payload.report) {
    renderReport(payload.report);
    return;
  }

  setView("main");
}

/**
 * @template T
 * @param {{ type: string }} message
 * @returns {Promise<T>}
 */
function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function loadState() {
  setView("main");
  setConnectionStatus("neutral", "Connecting to extension…");
  toggleBtn?.setAttribute("disabled", "true");

  try {
    const ping = await sendMessage({ type: MSG.PING });
    if (!ping?.ok) throw new Error("Ping failed");

    const response = await sendMessage({ type: MSG.GET_STATE });
    if (!response?.ok || !response.state) throw new Error("Failed to load state");

    renderPayload(response);
    toggleBtn?.removeAttribute("disabled");
    logger.log(SCOPE, "State loaded", response);
  } catch (err) {
    logger.error(SCOPE, "Failed to initialize popup", err);
    setConnectionStatus(
      "error",
      "Extension unavailable — click reload on chrome://extensions",
    );
  }
}

async function handleToggle() {
  if (!toggleBtn) return;

  toggleBtn.setAttribute("disabled", "true");
  setConnectionStatus("neutral", "Updating focus mode…");

  try {
    const response = await sendMessage({ type: MSG.TOGGLE_FOCUS });
    if (!response?.ok || !response.state) {
      throw new Error(response?.message ?? "Toggle failed");
    }

    renderPayload(response);
    logger.log(SCOPE, "Focus toggled", response);
  } catch (err) {
    logger.error(SCOPE, "Toggle failed", err);
    setConnectionStatus(
      "error",
      err instanceof Error ? err.message : "Could not toggle focus mode",
    );
  } finally {
    toggleBtn.removeAttribute("disabled");
  }
}

async function dismissReport() {
  try {
    const response = await sendMessage({ type: MSG.DISMISS_REPORT });
    if (response?.ok) renderPayload(response);
  } catch (err) {
    logger.error(SCOPE, "Dismiss report failed", err);
    setView("main");
  }
}

async function openTestPage() {
  try {
    const response = await sendMessage({ type: MSG.OPEN_TEST_PAGE });
    if (!response?.ok) throw new Error("Could not open test page");
    window.close();
  } catch (err) {
    logger.error(SCOPE, "Open test page failed", err);
    setConnectionStatus(
      "error",
      "Could not open test page — reload the extension and try again",
    );
  }
}

function registerListeners() {
  toggleBtn?.addEventListener("click", () => {
    handleToggle();
  });

  dismissReportBtn?.addEventListener("click", () => {
    dismissReport();
  });

  openTestPageBtn?.addEventListener("click", () => {
    openTestPage();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes[STORAGE_KEYS.focusState]?.newValue) {
      sendMessage({ type: MSG.GET_STATE })
        .then((response) => {
          if (response?.ok) renderPayload(response);
        })
        .catch(() => {});
    }

    if (changes[STORAGE_KEYS.sessionStats]?.newValue) {
      const stats = changes[STORAGE_KEYS.sessionStats].newValue;
      const total = Object.values(stats?.attempts ?? {}).reduce(
        (sum, n) => sum + Number(n || 0),
        0,
      );
      if (statBlocked && popupRoot?.getAttribute("data-focus") === "on") {
        statBlocked.textContent = String(total);
      }
    }
  });
}

registerListeners();
loadState();

if (appVersion) {
  try {
    appVersion.textContent = `v${chrome.runtime.getManifest().version}`;
  } catch {
    appVersion.textContent = "v0.4.0";
  }
}
