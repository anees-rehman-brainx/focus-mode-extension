/** Must match `MSG.BLOCKED_ATTEMPT` in `src/shared/messages.js`. */
const BLOCKED_ATTEMPT = "BLOCKED_ATTEMPT";

(function installNotificationHook() {
  if (globalThis.__focusModeNotificationHook) return;
  globalThis.__focusModeNotificationHook = true;

  const Native = window.Notification;
  if (typeof Native !== "function") return;

  /**
   * @param {"notification" | "permission"} kind
   */
  function report(kind) {
    try {
      chrome.runtime.sendMessage({
        type: BLOCKED_ATTEMPT,
        host: location.hostname || "unknown",
        kind,
      });
    } catch {
      /* extension context invalidated */
    }
  }

  function FocusNotification(title, options) {
    report("notification");
    const opts = options && typeof options === "object" ? options : {};
    return {
      title: String(title ?? ""),
      body: String(opts.body ?? ""),
      tag: String(opts.tag ?? ""),
      close() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      onclick: null,
      onshow: null,
      onerror: null,
      onclose: null,
    };
  }

  FocusNotification.requestPermission = function requestPermission(callback) {
    report("permission");
    const result = Promise.resolve("denied");
    if (typeof callback === "function") {
      result.then((value) => callback(value));
    }
    return result;
  };

  Object.defineProperty(FocusNotification, "permission", {
    get() {
      return Native.permission;
    },
  });

  FocusNotification.maxActions = Native.maxActions;

  window.Notification = FocusNotification;
})();
