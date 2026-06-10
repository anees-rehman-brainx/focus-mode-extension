import { EXTENSION_SLUG } from "./constants.js";

const PREFIX = `[${EXTENSION_SLUG}]`;

/**
 * @param {"log" | "warn" | "error"} level
 * @param {string} scope
 * @param {string} message
 * @param {unknown} [detail]
 */
function write(level, scope, message, detail) {
  const line = `${PREFIX} [${scope}] ${message}`;
  if (detail !== undefined) {
    console[level](line, detail);
  } else {
    console[level](line);
  }
}

export const logger = Object.freeze({
  log(scope, message, detail) {
    write("log", scope, message, detail);
  },
  warn(scope, message, detail) {
    write("warn", scope, message, detail);
  },
  error(scope, message, detail) {
    write("error", scope, message, detail);
  },
});
