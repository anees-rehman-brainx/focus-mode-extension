import { STORAGE_KEYS } from "../shared/constants.js";
import { normalizeHost } from "../shared/domains.js";
import { getStorageValue, setStorageValues } from "../shared/storage.js";
import { logger } from "../shared/logger.js";

const SCOPE = "stats";

/** @typedef {{ attempts: Record<string, number>; permissionPrompts: Record<string, number> }} SessionStats */

const EMPTY_STATS = Object.freeze({
  attempts: {},
  permissionPrompts: {},
});

/** @returns {Promise<SessionStats>} */
export async function getSessionStats() {
  const stored = await getStorageValue(STORAGE_KEYS.sessionStats, EMPTY_STATS);
  return {
    attempts:
      stored.attempts && typeof stored.attempts === "object"
        ? { ...stored.attempts }
        : {},
    permissionPrompts:
      stored.permissionPrompts && typeof stored.permissionPrompts === "object"
        ? { ...stored.permissionPrompts }
        : {},
  };
}

/** @param {SessionStats} stats */
export function getTotalBlocked(stats) {
  return Object.values(stats.attempts).reduce(
    (sum, count) => sum + Number(count || 0),
    0,
  );
}

export async function resetSessionStats() {
  await setStorageValues({
    [STORAGE_KEYS.sessionStats]: { attempts: {}, permissionPrompts: {} },
  });
}

/**
 * @param {string} host
 * @param {"notification" | "permission"} kind
 */
export async function recordBlockedAttempt(host, kind) {
  const domain = normalizeHost(host);
  const stats = await getSessionStats();

  stats.attempts[domain] = (stats.attempts[domain] ?? 0) + 1;
  if (kind === "permission") {
    stats.permissionPrompts[domain] = (stats.permissionPrompts[domain] ?? 0) + 1;
  }

  await setStorageValues({ [STORAGE_KEYS.sessionStats]: stats });
  logger.log(SCOPE, "Blocked attempt recorded", {
    domain,
    kind,
    total: stats.attempts[domain],
  });
}

/**
 * @param {string | null} sessionStartedAt
 */
export async function buildSessionReport(sessionStartedAt) {
  const stats = await getSessionStats();
  const totalBlocked = getTotalBlocked(stats);
  const endedAt = new Date();
  const started = sessionStartedAt ? new Date(sessionStartedAt) : null;
  const durationMs =
    started && !Number.isNaN(started.getTime())
      ? Math.max(0, endedAt.getTime() - started.getTime())
      : 0;

  const byDomain = Object.entries(stats.attempts)
    .map(([domain, count]) => ({
      domain,
      count: Number(count),
      percent: totalBlocked
        ? Math.round((Number(count) / totalBlocked) * 100)
        : 0,
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));

  return {
    endedAt: endedAt.toISOString(),
    durationMs,
    totalBlocked,
    byDomain,
  };
}

/** @returns {Promise<object | null>} */
export async function getLastSessionReport() {
  const report = await getStorageValue(STORAGE_KEYS.lastSessionReport, null);
  if (!report || typeof report !== "object") return null;
  return report;
}

/** @param {object} report */
export async function saveLastSessionReport(report) {
  await setStorageValues({
    [STORAGE_KEYS.lastSessionReport]: report,
    [STORAGE_KEYS.reportPendingView]: true,
  });
}

export async function clearPendingReportView() {
  await setStorageValues({ [STORAGE_KEYS.reportPendingView]: false });
}

/** @returns {Promise<boolean>} */
export async function isReportPendingView() {
  return Boolean(await getStorageValue(STORAGE_KEYS.reportPendingView, false));
}
