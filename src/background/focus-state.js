import {
  applyGlobalNotificationBlock,
  clearGlobalNotificationBlock,
} from "./content-settings.js";
import {
  disableNotificationHooks,
  enableNotificationHooks,
} from "./injection.js";
import {
  buildSessionReport,
  resetSessionStats,
  saveLastSessionReport,
} from "./stats.js";
import { getFocusState, setStorageValues } from "../shared/storage.js";
import { STORAGE_KEYS } from "../shared/constants.js";
import { logger } from "../shared/logger.js";

const SCOPE = "focus-state";

/**
 * @param {boolean} active
 * @param {number} [blockedCount]
 */
async function updateBadge(active, blockedCount = 0) {
  try {
    let badgeText = "";
    if (active) {
      badgeText = blockedCount > 0 ? String(Math.min(blockedCount, 99)) : "ON";
    }
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: "#059669" });
    await chrome.action.setTitle({
      title: active
        ? `Focus Mode — ON (${blockedCount} blocked this session)`
        : "Focus Mode — click to open",
    });
  } catch (err) {
    logger.warn(SCOPE, "Failed to update badge", err);
  }
}

/** Re-apply enforcement from persisted state (idempotent). */
export async function syncFocusEnforcement() {
  const state = await getFocusState();

  if (state.focusActive) {
    await applyGlobalNotificationBlock();
    await enableNotificationHooks();
    await updateBadge(true);
    logger.log(SCOPE, "Focus enforcement synced — ON");
    return;
  }

  await disableNotificationHooks();
  await updateBadge(false);
  logger.log(SCOPE, "Focus enforcement synced — OFF");
}

/**
 * @returns {Promise<{
 *   state: { focusActive: boolean; sessionStartedAt: string | null };
 *   report?: object;
 * }>}
 */
export async function enableFocus() {
  await applyGlobalNotificationBlock();
  await resetSessionStats();
  await enableNotificationHooks();

  const nextState = {
    focusActive: true,
    sessionStartedAt: new Date().toISOString(),
  };

  const saved = await setStorageValues({
    [STORAGE_KEYS.focusState]: nextState,
    [STORAGE_KEYS.reportPendingView]: false,
  });
  if (!saved) {
    await clearGlobalNotificationBlock().catch(() => {});
    await disableNotificationHooks().catch(() => {});
    throw new Error("STORAGE_FAILED");
  }

  await updateBadge(true, 0);
  logger.log(SCOPE, "Focus enabled", nextState);
  return { state: nextState };
}

/**
 * @returns {Promise<{
 *   state: { focusActive: boolean; sessionStartedAt: string | null };
 *   report: object;
 * }>}
 */
export async function disableFocus() {
  const previous = await getFocusState();
  const report = await buildSessionReport(previous.sessionStartedAt);

  await clearGlobalNotificationBlock();
  await disableNotificationHooks();
  await saveLastSessionReport(report);

  const nextState = {
    focusActive: false,
    sessionStartedAt: null,
  };

  const saved = await setStorageValues({
    [STORAGE_KEYS.focusState]: nextState,
  });
  if (!saved) {
    throw new Error("STORAGE_FAILED");
  }

  await updateBadge(false);
  logger.log(SCOPE, "Focus disabled", { nextState, report });
  return { state: nextState, report };
}

/** @returns {Promise<{ state: object; report?: object }>} */
export async function toggleFocus() {
  const state = await getFocusState();
  if (state.focusActive) {
    return disableFocus();
  }
  return enableFocus();
}

/** @param {number} blockedCount */
export async function refreshActiveBadge(blockedCount) {
  const state = await getFocusState();
  if (state.focusActive) {
    await updateBadge(true, blockedCount);
  }
}
