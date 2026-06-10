/**
 * @param {unknown} err
 * @returns {string}
 */
export function toErrorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    typeof err === "object" &&
    err !== null &&
    typeof /** @type {{ message?: unknown }} */ (err).message === "string"
  ) {
    return /** @type {{ message: string }} */ (err).message;
  }
  return "Unknown error";
}

/**
 * @param {string} code
 * @param {string} [detail]
 */
export function userFacingError(code, detail) {
  switch (code) {
    case "CONTENT_SETTINGS_FAILED":
      return "Could not update notification settings. Check extension permissions.";
    case "STORAGE_FAILED":
      return "Could not save focus state. Try again.";
    case "TOGGLE_FAILED":
      return detail ?? "Focus mode toggle failed. Reload the extension.";
    default:
      return detail ?? "Something went wrong.";
  }
}
