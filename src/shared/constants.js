/**
 * Canonical project slug — storage namespace, logs, footer display.
 * Keep in sync with the slug text in `src/popup/popup.html`.
 * Stable Chrome extension ID (manifest `key`) deferred to final packaging sprint.
 */
export const EXTENSION_SLUG = "brainx-extension-focus-mode-hackthon";

/** @param {string} key */
export function storageKey(key) {
  return `${EXTENSION_SLUG}:${key}`;
}

export const STORAGE_KEYS = Object.freeze({
  focusState: storageKey("focusState"),
  sessionStats: storageKey("sessionStats"),
  lastSessionReport: storageKey("lastSessionReport"),
  reportPendingView: storageKey("reportPendingView"),
  contentSettingsSnapshot: storageKey("contentSettingsSnapshot"),
  whitelist: storageKey("whitelist"),
  schedule: storageKey("schedule"),
});

export const CONTENT_SCRIPT = Object.freeze({
  id: "focus-notification-hook",
  file: "src/content/notification-hook.js",
});

/** Bundled test page — open via chrome.runtime.getURL(TEST_PAGE_PATH) */
export const TEST_PAGE_PATH = "test/fixtures/basic-notification.html";
