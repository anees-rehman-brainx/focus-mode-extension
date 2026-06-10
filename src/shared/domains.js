/**
 * @param {string | undefined | null} host
 * @returns {string}
 */
export function normalizeHost(host) {
  const raw = String(host ?? "")
    .trim()
    .toLowerCase();
  if (!raw || raw === "unknown") return "unknown";
  return raw.replace(/^www\./, "");
}
