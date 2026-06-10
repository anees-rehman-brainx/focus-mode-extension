# Focus Mode Activator — Session Resume (June 10, 2026)

> **Purpose:** Handoff document from our planning + implementation chat. Use this to resume next week without re-reading the full conversation.  
> **Branch:** `hackthon-3-june-10-2026` (both hackathon repos; extension lives in workspace folder)  
> **Current extension version:** `0.4.0`  
> **Plan doc (single source of truth):** [`FOCUS_MODE_PLAN.md`](./FOCUS_MODE_PLAN.md) (this folder)

---

## 1. What we’re building

**Chrome Extension — Focus Mode Activator**

One-click toggle that **blocks OS-level browser notifications** (permission prompts, desktop toasts, web push → toast) across **all tabs** profile-wide. When deactivated, show a **session report** (count + per-site breakdown).

**Explicitly NOT in scope (locked):**
- WebSockets / SSE (stay connected — not disturbing)
- In-page DOM toasts (Slack-style banners inside the page)
- NestJS / React hackathon repos (extension is standalone deliverable)

---

## 2. Workspace layout

```
hackathon-workspace/
├── hackathon-task-backend/         # NestJS starter — NOT used for extension MVP
├── hackathon-task-frontend/        # Vite/React starter — NOT used for extension MVP
└── focus-mode-extension/           # ★ Primary deliverable
    └── docs/
        ├── Cursor chat history.md
        ├── FOCUS_MODE_PLAN.md
        ├── FOCUS_MODE_SESSION_RESUME.md
        └── DEV_GUIDE.md
```

**Why separate folder?** Chrome only needs a folder with `manifest.json`; we kept the extension isolated from the two git repos. Commits go on `hackthon-3-june-10-2026` when you add this folder to a repo.

---

## 3. Core mental model (agreed)

### Three layers

| Layer | Role | Survives tab refresh? |
|-------|------|------------------------|
| **`chrome.contentSettings`** | Actually blocks OS notifications (global `<all_urls>` → block) | ✅ Yes |
| **Service worker + `chrome.storage.local`** | Single source of truth: ON/OFF, stats, whitelist (future) | ✅ Yes |
| **Content scripts** | Count blocked attempts for session report | Hook reinjected; state in SW |

### User on domain A clicks activate → all tabs affected

State is **not** per-tab. Service worker writes to storage + Chrome rule table. Every tab gets blocking instantly; content scripts reinject on navigation/refresh.

### WebSockets

Push that ends in `showNotification()` → **blocked**. WebSocket connections themselves → **not blocked** (by design).

---

## 4. Key decisions (locked)

| Decision | Choice |
|----------|--------|
| Git branch | `hackthon-3-june-10-2026` only — no separate extension branch |
| Project slug (internal ID) | `brainx-extension-focus-mode-hackthon` |
| Chrome extension ID / manifest `key` | **Deferred to final packaging** — no `.pem` during dev (caused Chrome warnings) |
| Blocking approach | Hybrid: `contentSettings` + content-script counters |
| WebSockets | Do not block |
| In-page toasts | Out of MVP scope |
| Workflow | Sprint-by-sprint: summary → feedback → go-ahead → implement → test |
| Extension folder | `focus-mode-extension/` at workspace root |

### Pending from plan (Q1–Q7 — defaulted unless changed next week)

- Icon click opens popup (toggle inside popup) — not direct icon toggle
- Incognito: spanning (not decided explicitly)
- Manual OFF during schedule: user wins (Sprint 4)
- Domain grouping: full hostname preferred
- MVP target: through Sprint 3 for demo, 4–5 if time

---

## 5. Implementation progress

### ✅ Sprint 0 — Scaffold (done)

- MV3 manifest, service worker, popup shell
- Shared modules: `messages.js`, `storage.js`, `logger.js`, `constants.js`
- Icons, README

### ✅ Sprint 1 — Toggle + global blocking (done)

- `focus-state.js` — enable/disable/toggle
- `content-settings.js` — `<all_urls>` block + clear on OFF
- Popup toggle wired via `TOGGLE_FOCUS`
- Badge ON/OFF; re-apply on browser startup
- Permissions: `contentSettings`, `storage`

### ✅ Sprint 2 — Counting + session report (done)

- `notification-hook.js` — wraps `Notification` + `requestPermission`
- `injection.js` — dynamic register/inject on focus ON
- `stats.js` — per-domain counts, session report builder
- Report UI in popup on deactivate; **Done** dismisses report
- Live counter in popup + badge count
- Permissions added: `scripting`, `tabs`, `host_permissions` (http, https, file)

### 🔧 Sprint 2.5 / v0.4 fixes (done)

- **Test page button** moved above fold (was hidden in footer)
- **`OPEN_TEST_PAGE`** opens bundled `test/fixtures/basic-notification.html` via `chrome.runtime.getURL`
- Version display: **v0.4.0** in popup header
- Fixed service worker warning: check script exists before `unregisterContentScripts`
- Popup body scrollable (`max-height` + `overflow-y: auto`)

### ⏳ Sprint 3 — Not started (next week)

- Options page
- Whitelist CRUD + per-domain `allow` overrides
- Keyboard shortcut (`chrome.commands`, default `Alt+Shift+F`)

### ⏳ Sprint 4 — Not started

- Auto-schedule (daily hours)
- Distraction score in report

### ⏳ Sprint 5 — Not started

- Polish, uninstall cleanup, README, stable extension ID packaging, demo

---

## 6. Extension file structure (current)

```
focus-mode-extension/
├── manifest.json                    # v0.4.0
├── icons/
├── test/fixtures/
│   └── basic-notification.html      # Bundled test page
├── src/
│   ├── background/
│   │   ├── service-worker.js
│   │   ├── focus-state.js
│   │   ├── content-settings.js
│   │   ├── injection.js
│   │   └── stats.js
│   ├── content/
│   │   └── notification-hook.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── shared/
│       ├── constants.js             # EXTENSION_SLUG, STORAGE_KEYS, TEST_PAGE_PATH
│       ├── domains.js
│       ├── errors.js
│       ├── logger.js
│       ├── messages.js
│       └── storage.js
└── README.md                 # links to docs/
```

---

## 7. Storage keys (namespaced)

All keys prefixed: `brainx-extension-focus-mode-hackthon:`

| Key | Purpose |
|-----|---------|
| `focusState` | `{ focusActive, sessionStartedAt }` |
| `sessionStats` | `{ attempts: { domain: count }, permissionPrompts }` |
| `lastSessionReport` | Report shown after deactivate |
| `reportPendingView` | Whether to show report on popup open |

---

## 8. Message types (service worker ↔ popup)

| Message | Direction | Purpose |
|---------|-----------|---------|
| `PING` / `PONG` | popup → SW | Health check |
| `GET_STATE` | popup → SW | State + blockedCount + report flags |
| `TOGGLE_FOCUS` | popup → SW | Enable/disable focus |
| `DISMISS_REPORT` | popup → SW | Close report view |
| `OPEN_TEST_PAGE` | popup → SW | Open bundled test HTML in new tab |
| `BLOCKED_ATTEMPT` | content script → SW | Increment stats `{ host, kind }` |

---

## 9. How to run & test (quick reference)

### Load / reload

1. `chrome://extensions` → Developer mode ON
2. **Load unpacked** once → select `focus-mode-extension/`
3. After code changes:
   - **Popup HTML/CSS/JS:** close popup → reopen
   - **Service worker / manifest:** click **Reload** on extension card

### Verify v0.4.0

- Extensions page shows version **0.4.0**
- Popup header: `Focus Mode · v0.4.0`
- Button: **Open notification test page** (below Enter Focus Mode)

### Test blocking + report

1. Reload extension
2. Popup → **Open notification test page**
3. **Enter Focus Mode**
4. On test tab: **Show notification** several times
5. Popup counter increases; badge updates
6. **Exit Focus Mode** → session report → **Done**

### Do NOT rely on opening file path manually

`file://` paths are unreliable in Chrome. Use the popup test button.

---

## 10. Chat timeline (summary)

| Phase | What we did |
|-------|-------------|
| **Discovery** | Mapped workspace: 2 git repos (Nest + React starters), hackathon branch `hackthon-3-june-10-2026` |
| **Requirements** | User provided Focus Mode brief + suggested features (schedule, distraction score, shortcut, whitelist) |
| **Planning** | Created `FOCUS_MODE_PLAN.md` — sprints 0–5, mental model, edge cases, decision log |
| **Refinement** | Explained global vs per-tab state, notification types, WebSocket boundary |
| **Architecture diagrams** | Mermaid flows for 3 layers, activate sequence, allow/block rules |
| **Sprint 0** | Extension scaffold — user confirmed loaded unpacked |
| **UI polish** | Popup redesign (hero, stats, status pill) |
| **Slug / ID** | Internal slug `brainx-extension-focus-mode-hackthon`; tried manifest `key` + `.pem` → **reverted** (Chrome warning, deferred to ship) |
| **Sprint 1** | Toggle + `contentSettings` global block + badge |
| **Sprint 2** | Content hooks, stats, session report UI |
| **Test page pain** | User couldn’t open `file://` fixture → added bundled test page + open button |
| **v0.4** | Moved test button above fold, version label, fixed unregister warning |
| **Pause** | Time up — resume Sprint 3 next week |

---

## 11. Known issues / notes

| Item | Status |
|------|--------|
| Footer test button not visible | Fixed in 0.4 — moved to main view |
| `Nonexistent script ID` on SW startup | Fixed — check before unregister |
| `.pem` in extension folder | Removed — do not re-add until Sprint 5 packaging |
| User mentioned testing “all sites + custom restriction” in v0.3 | Likely Chrome’s native site settings UI when extension blocks notifications — **whitelist UI not built yet** (Sprint 3) |
| Counts may under-report SW-only push paths | Documented limitation; browser still blocks via `contentSettings` |

---

## 12. Resume checklist (next week)

- [ ] Pull/open workspace on `hackthon-3-june-10-2026`
- [ ] Reload extension — confirm **0.4.0**
- [ ] Quick smoke test: toggle + test page + report
- [ ] Read Sprint 3 section in `FOCUS_MODE_PLAN.md`
- [ ] Post Sprint 3 summary in chat → get go-ahead → implement:
  - Options page
  - Whitelist storage + `contentSettings` allow per domain
  - `chrome.commands` toggle
- [ ] Update decision log in plan when Q1–Q7 finalized
- [ ] Sprint 4/5 as time allows

---

## 13. Related files to open first

1. [`FOCUS_MODE_PLAN.md`](./FOCUS_MODE_PLAN.md) — full spec
2. [`DEV_GUIDE.md`](./DEV_GUIDE.md) — dev reload guide
3. [`../src/background/focus-state.js`](../src/background/focus-state.js) — core toggle logic
4. [`../src/popup/popup.js`](../src/popup/popup.js) — UI state + report

---

*Generated from Cursor pair-programming session, June 10, 2026. Paste or share this file to restore context next week.*
