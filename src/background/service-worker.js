import { MSG } from "../shared/messages.js";
import { TEST_PAGE_PATH } from "../shared/constants.js";
import { getFocusState } from "../shared/storage.js";
import {
  refreshActiveBadge,
  syncFocusEnforcement,
  toggleFocus,
} from "./focus-state.js";
import {
  clearPendingReportView,
  getLastSessionReport,
  getSessionStats,
  getTotalBlocked,
  isReportPendingView,
  recordBlockedAttempt,
} from "./stats.js";
import { toErrorMessage, userFacingError } from "../shared/errors.js";
import { logger } from "../shared/logger.js";

const SCOPE = "service-worker";

/**
 * @param {unknown} message
 * @returns {message is { type: string }}
 */
function isRuntimeMessage(message) {
  return (
    typeof message === "object" &&
    message !== null &&
    typeof /** @type {{ type?: unknown }} */ (message).type === "string"
  );
}

async function buildPopupPayload() {
  const state = await getFocusState();
  const stats = await getSessionStats();
  const blockedCount = getTotalBlocked(stats);
  const reportPending = await isReportPendingView();
  const lastReport = reportPending ? await getLastSessionReport() : null;

  return {
    ok: true,
    state,
    blockedCount,
    lastReport,
    reportPending,
  };
}

async function handleMessage(message) {
  switch (message.type) {
    case MSG.PING:
      return { type: MSG.PONG, ok: true };

    case MSG.GET_STATE:
      return buildPopupPayload();

    case MSG.TOGGLE_FOCUS: {
      try {
        const result = await toggleFocus();
        return { ok: true, ...result, ...(await buildPopupPayload()) };
      } catch (err) {
        const detail = toErrorMessage(err);
        logger.error(SCOPE, "Toggle focus failed", err);
        return {
          ok: false,
          error: "TOGGLE_FAILED",
          message: userFacingError("TOGGLE_FAILED", detail),
        };
      }
    }

    case MSG.DISMISS_REPORT: {
      await clearPendingReportView();
      return buildPopupPayload();
    }

    case MSG.OPEN_TEST_PAGE: {
      const url = chrome.runtime.getURL(TEST_PAGE_PATH);
      const tab = await chrome.tabs.create({ url, active: true });
      return { ok: true, url, tabId: tab.id };
    }

    case MSG.BLOCKED_ATTEMPT: {
      const host =
        typeof message.host === "string" ? message.host : "unknown";
      const kind =
        message.kind === "permission" ? "permission" : "notification";

      const focus = await getFocusState();
      if (!focus.focusActive) {
        return { ok: true, ignored: true };
      }

      await recordBlockedAttempt(host, kind);
      const stats = await getSessionStats();
      const blockedCount = getTotalBlocked(stats);
      await refreshActiveBadge(blockedCount);
      return { ok: true, blockedCount };
    }

    default:
      logger.warn(SCOPE, "Unknown message type", message.type);
      return { ok: false, error: "UNKNOWN_MESSAGE" };
  }
}

function registerListeners() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRuntimeMessage(message)) {
      sendResponse({ ok: false, error: "INVALID_MESSAGE" });
      return false;
    }

    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        logger.error(SCOPE, "Message handler failed", err);
        sendResponse({
          ok: false,
          error: "INTERNAL_ERROR",
          message: userFacingError("TOGGLE_FAILED"),
        });
      });

    return true;
  });

  chrome.runtime.onInstalled.addListener(({ reason }) => {
    logger.log(SCOPE, "Extension installed", { reason });
    syncFocusEnforcement().catch((err) => {
      logger.error(SCOPE, "Install sync failed", err);
    });
  });

  chrome.runtime.onStartup.addListener(() => {
    logger.log(SCOPE, "Browser startup");
    syncFocusEnforcement().catch((err) => {
      logger.error(SCOPE, "Startup sync failed", err);
    });
  });
}

async function bootstrap() {
  registerListeners();
  await syncFocusEnforcement();
  const state = await getFocusState();
  logger.log(SCOPE, "Service worker ready", state);
}

bootstrap().catch((err) => {
  logger.error(SCOPE, "Bootstrap failed", err);
});
