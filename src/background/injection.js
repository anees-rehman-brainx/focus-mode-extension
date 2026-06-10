import { CONTENT_SCRIPT } from "../shared/constants.js";
import { logger } from "../shared/logger.js";

const SCOPE = "injection";

function getInjectableUrlPatterns() {
  return [
    "http://*/*",
    "https://*/*",
    "file:///*",
    `chrome-extension://${chrome.runtime.id}/*`,
  ];
}

/** Register dynamic content script while focus mode is ON. */
export async function registerNotificationHooks() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT.id],
    });
    if (existing.length > 0) return;

    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT.id,
        js: [CONTENT_SCRIPT.file],
        matches: getInjectableUrlPatterns(),
        runAt: "document_start",
        allFrames: true,
      },
    ]);
    logger.log(SCOPE, "Content script registered");
  } catch (err) {
    logger.error(SCOPE, "Failed to register content script", err);
    throw err;
  }
}

export async function unregisterNotificationHooks() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT.id],
    });
    if (existing.length === 0) {
      return;
    }

    await chrome.scripting.unregisterContentScripts({
      ids: [CONTENT_SCRIPT.id],
    });
    logger.log(SCOPE, "Content script unregistered");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Nonexistent script ID")) {
      return;
    }
    logger.warn(SCOPE, "Unregister content script", err);
  }
}

/** Inject hook into already-open tabs (register covers future navigations). */
export async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: getInjectableUrlPatterns() });

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: [CONTENT_SCRIPT.file],
        });
      } catch {
        /* restricted pages — chrome://, Web Store, etc. */
      }
    }),
  );
}

export async function enableNotificationHooks() {
  await registerNotificationHooks();
  await injectIntoOpenTabs();
}

export async function disableNotificationHooks() {
  await unregisterNotificationHooks();
}
