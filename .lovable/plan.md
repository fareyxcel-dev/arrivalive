## Goals

1. Send notifications through every available push/web channel **in parallel**, not as a fallback chain.
2. Add **global keyboard shortcuts** for Force Refresh, Export Schedule, and open Settings.
3. Make the header **responsive** — text rows never wrap or overlap on small screens.
4. Smooth the scroll-shrink with **spring-like easing** so logo / center text / menu icon morph in unison.
5. Show an **export-in-progress spinner** in `ExportModal` and disable controls while generating.
6. Make header font/appearance updates apply **instantly** (no refresh).

---

## 1. Parallel multi-channel push (`supabase/functions/send-notification/index.ts`)

Currently push uses a fallback chain (PushAlert → OneSignal → FCM, stops at first success). Change to fire all three **simultaneously** with `Promise.allSettled`:

```text
push.sent = ANY of (pushAlertOk, oneSignalOk, fcmOk, webPushOk)
push.channels = { pushalert, onesignal, fcm, webpush }  // per-channel result
```

- Always attempt PushAlert if `onesignal_player_id` exists.
- Always attempt OneSignal if both creds + player id exist.
- Always attempt FCM if `fcm_token` exists.
- Also invoke `send-web-push` (VAPID) in parallel if `push_subscription` exists.
- Log one row per channel attempted into `notification_log` (type: `push:pushalert`, `push:onesignal`, etc.) so users see each delivery path.
- Apply same parallel pattern to `send-test-notification` for the admin "Send Test 'Landed'" button.

This guarantees redundancy: every active subscriber gets the alert across every registered transport.

---

## 2. Keyboard shortcuts (new `src/hooks/useKeyboardShortcuts.ts`)

Add a hook used in `Index.tsx` that listens on `window`:

| Combo | Action |
|---|---|
| `Ctrl/Cmd + R` (override default) | Force Refresh flights |
| `Ctrl/Cmd + E` | Open Export modal |
| `Ctrl/Cmd + ,` | Open Settings modal |

- Ignore when focus is inside `input`, `textarea`, `select`, or `[contenteditable]`.
- `preventDefault()` only when the combo matches our list.
- Show a tiny `toast.info('Shortcut: Refresh')` style hint on first trigger of each.
- Update menu items in `NewHeader` to display the shortcut (e.g. `Refresh ⌘R`) using a right-aligned `<kbd>` chip.

---

## 3. Responsive header rows (`src/components/NewHeader.tsx`)

Use container-aware breakpoints so dual-text rows always fit on phones down to 320 px:

- Wrap center block in a flex column with `min-w-0` and `truncate` already in place.
- Add a viewport-based size scale via a `useResizeObserver` (or `window.innerWidth` listener) producing one of three modes: `xs` (<360), `sm` (360–420), `md` (>420).
  - `xs`: time `10px` / secondary `8px`, gap `1px`, hide the "·" inside date row (use single space), shorten weather row to "Cloudy · 2h" form.
  - `sm`: current scrolled sizes (time `11px` / sec `9px`).
  - `md`: default sizes (time `13px` / sec `10px`).
- Apply `max-w-[140px]` (xs) / `max-w-[180px]` (sm) / `max-w-[220px]` (md) to the secondary weather text with `truncate`.
- Add `whitespace-nowrap` + `overflow-hidden` to both rows; pipe separators rendered as flex items so they collapse cleanly.

Result: at 320 px both rows render on a single line each without wrap or collision with logo/menu.

---

## 4. Spring-like unison scroll scaling (`NewHeader.tsx` + `index.css`)

Replace the current `transition-all duration-300` (linear-ish) with a shared spring curve and a single source of truth:

- Add CSS variable in `index.css`:
  ```text
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --header-scale-duration: 420ms;
  ```
- Drive scaling via a single `--header-scale` CSS var on the `<header>` element (set to `1` or `0.85` based on `isScrolled`).
- Logo, center wrapper, and menu wrapper all use `transform: scale(var(--header-scale))` with `transition: transform var(--header-scale-duration) var(--ease-spring)`.
- Because all three children share the same var + transition, they shrink and grow back **in perfect sync** with a subtle overshoot bounce.
- Throttle scroll listener with `requestAnimationFrame` to prevent jitter.

---

## 5. ExportModal busy state (`src/components/ExportModal.tsx`)

Add `isExporting` state. While true:

- Disable the Date `<select>`, Terminal buttons, and close `X` (apply `disabled` + `pointer-events-none` + `opacity-60`).
- Replace the Download button label with a spinning `<Loader2 className="animate-spin"/>` + "Generating…".
- Click-outside to close becomes a no-op.

`handleExport` becomes async:
1. `setIsExporting(true)`
2. Build CSV (and add a small `await new Promise(r => setTimeout(r, 50))` to let the spinner paint for the trivial case).
3. Trigger download.
4. `setIsExporting(false)` then `onClose()`.
5. On error: `toast.error('Export failed')` and reset `isExporting`.

(Existing CSV generation stays; no XLSX dependency added unless requested.)

---

## 6. Instant header font/appearance preview

Already mostly working (SettingsContext writes CSS vars + injects `<style id="global-font-style">` on every settings change). Two small fixes to guarantee the header reflects changes with no refresh:

- In `NewHeader.tsx`, apply `style={{ fontFamily: 'var(--font-body)' }}` to the time/weather `<p>` elements (currently they inherit, but a couple of buttons may not pick up immediately on certain browsers — explicit var avoids stale cached fonts).
- Add `font-variant-numeric: tabular-nums` so digits don't reflow as fonts change.
- Ensure the injected `<style>` block in `SettingsContext` includes `header, header * { font-family: var(--font-body) !important; }` (already present) and is re-flushed by toggling a `data-font-rev` attribute on `<html>` so WebKit forces a repaint:
  ```text
  document.documentElement.setAttribute('data-font-rev', String(Date.now()));
  ```

---

## Files touched

- `supabase/functions/send-notification/index.ts` — parallel channel dispatch + per-channel logs
- `supabase/functions/send-test-notification/index.ts` — same parallel pattern
- `src/hooks/useKeyboardShortcuts.ts` — **new** hook
- `src/pages/Index.tsx` — wire shortcut hook
- `src/components/NewHeader.tsx` — responsive sizing, spring scaling, shortcut hints in menu, instant font var
- `src/components/ExportModal.tsx` — busy state + spinner + disabled controls
- `src/contexts/SettingsContext.tsx` — `data-font-rev` repaint nudge
- `src/index.css` — `--ease-spring`, `--header-scale-duration`, header transform rules

No DB migrations, no new secrets, no new dependencies.
