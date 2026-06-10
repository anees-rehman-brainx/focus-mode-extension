# Focus Mode — Developer Guide

Chrome extension (Manifest V3) — block browser notification popups with one click.

**Version:** `0.4.0` · **Branch:** `hackthon-3-june-10-2026`

## Identifiers

| ID type | Value |
|---------|--------|
| **Project slug** (footer, storage, logs) | `brainx-extension-focus-mode-hackthon` |
| **Chrome extension ID** | Auto-assigned for unpacked loads — stable ID deferred to final packaging |

Defined in `src/shared/constants.js`.

## Load unpacked (first time)

1. Open `chrome://extensions` → **Developer mode** ON
2. **Load unpacked** → select this folder (`focus-mode-extension/`)
3. Pin the extension from the puzzle icon

## Reload vs refresh

| What you changed | What to do |
|------------------|------------|
| **Popup** (HTML, CSS, JS) | Close popup → reopen. **No reload needed.** |
| **Service worker** (background JS) | **Reload** extension on `chrome://extensions` |
| **manifest.json** | **Reload** extension |
| **Content scripts / test tab** | **Reload** extension **and** refresh the test tab |

Load unpacked **once**. After that use the extension **Reload** button.

## Test blocking + session report (v0.4)

1. **Reload** extension — confirm version **0.4.0**
2. Popup → **Open notification test page** (button below Enter Focus Mode)
3. **Enter Focus Mode**
4. On test tab: click **Show notification** several times
5. Popup **Blocked this session** count increases; badge updates
6. **Exit Focus Mode** → session report → **Done**

> Do not rely on opening `test/fixtures/basic-notification.html` via `file://` — use the popup button.

## Project structure

```
focus-mode-extension/
├── docs/                    # All documentation
├── manifest.json
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── shared/
└── test/fixtures/
```

See [docs/README.md](./docs/README.md) for plan, chat history, and session resume.
