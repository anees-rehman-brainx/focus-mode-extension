const ALL_URLS_PATTERN = "<all_urls>";

/**
 * @param {() => void} callback
 */
function runContentSettingsOp(callback) {
  return new Promise((resolve, reject) => {
    try {
      callback(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(undefined);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/** Block desktop notifications for all sites (profile-wide). */
export async function applyGlobalNotificationBlock() {
  await runContentSettingsOp((done) => {
    chrome.contentSettings.notifications.set(
      {
        primaryPattern: ALL_URLS_PATTERN,
        setting: "block",
      },
      done,
    );
  });
}

/** Release extension control of the global notifications rule. */
export async function clearGlobalNotificationBlock() {
  await runContentSettingsOp((done) => {
    chrome.contentSettings.notifications.clear(
      { primaryPattern: ALL_URLS_PATTERN },
      done,
    );
  });
}

/**
 * @param {string} primaryUrl
 * @returns {Promise<chrome.contentSettings.ContentSetting>}
 */
export async function getNotificationSettingForUrl(primaryUrl) {
  return new Promise((resolve, reject) => {
    chrome.contentSettings.notifications.get({ primaryUrl }, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(details.setting);
    });
  });
}
