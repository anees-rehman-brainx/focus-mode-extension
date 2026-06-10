import { logger } from "./logger.js";
import { STORAGE_KEYS } from "./constants.js";

const DEFAULT_STATE = Object.freeze({
  focusActive: false,
  sessionStartedAt: null,
});

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export async function getStorageValue(key, fallback) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? fallback;
  } catch (err) {
    logger.error("storage", `Failed to read "${key}"`, err);
    return fallback;
  }
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Promise<boolean>}
 */
export async function setStorageValues(values) {
  try {
    await chrome.storage.local.set(values);
    return true;
  } catch (err) {
    logger.error("storage", "Failed to write values", { values, err });
    return false;
  }
}

/** @returns {Promise<{ focusActive: boolean; sessionStartedAt: string | null }>} */
export async function getFocusState() {
  const stored = await getStorageValue(STORAGE_KEYS.focusState, DEFAULT_STATE);
  return {
    focusActive: Boolean(stored.focusActive),
    sessionStartedAt:
      typeof stored.sessionStartedAt === "string"
        ? stored.sessionStartedAt
        : null,
  };
}
