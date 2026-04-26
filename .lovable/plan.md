# Combined Plan: SolidX + FlightStats Tracker + Header Morph + Glass Expansion + PWA & Notifications

This bundles the previously-approved work plus all new requests in this message.

---

## A. SolidX Style System (4 new presets, Dark/Light/Adaptive variants)

**New file `src/lib/solidxStyles.ts`** — defines:
- **LunaX** — soft solid slab, top vertical sheen
- **AeroX** — chrome pill, broad horizontal mid reflection
- **LinuxX** — flat matte gradient, subtle inner shadow
- **AquaX** — glossy aqua dome + bottom reflection

Each preset has Dark + Light color schemes for: background gradient, top inner highlight, bottom inner shadow, drop shadow, border (kept low-opacity ~0.06 — "less visible borders" on flight cards). Default `solidxOpacity = 1.0`.

**Three variants per preset** (also added to all existing Glass presets):
- **Dark** — dark scheme.
- **Light** — light scheme.
- **Adaptive** — flips based on live background luminance (see §D).

**Settings additions** (`SettingsContext.tsx`):
- `cardStyleFamily: 'glass' | 'solidx'`
- `solidxPreset`, `styleVariant: 'dark' | 'light' | 'adaptive'`
- `solidxOpacity` (0..1, default 1) — slider lets SolidX become semi-transparent like glass.
- Existing `glassOpacity` widened so glass can also approach opaque.
- **Dual-style mixing rule**: when `dualGlass` mixes a SolidX with a Glass style → glass effective opacity +0.15, solid -0.15.

**`SettingsModal.tsx` Style tab**: new "SolidX" sub-section with thumbnails + Dark/Light/Adaptive segmented toggle + a single Opacity slider that targets the active family.

---

## B. Status-Aware Tinting (Glass + SolidX)

Status palette: Delayed `#c23700`, Cancelled `#7d0233`, Landed `#025c2a`, Default `#fafafa`.

In `FlightCard.tsx` `getCardBgStyle()`:
- Mix `statusTint` into active gradient at ~18% (Dark) / ~12% (Light).
- Same tint applied to `box-shadow` and border highlight.
- Text/logo/icon filters **unchanged** — only background, shadow, border are tinted.

---

## C. Expanded Glass Style Library (new presets from references)

In `SettingsContext.tsx` `GLASS_PRESETS` add (alongside existing Frosted/Liquid/Prismatic/Stained/Polarized/iOS/Aero/Vista/Windows):
- **Linux** — minimal clean glass
- **Mac** — macOS vibrancy
- **Ubuntu** — purple/orange tinted
- **Nintendo** — red/white playful
- **PlayStation** — blue/black sleek
- **Xbox** — green/black bold
- **Steam** — dark blue industrial
- **ROG** — red/black aggressive
- **Nokia** — blue/gray retro
- **Samsung** — blue/white modern
- **iPhone** — silver/white premium
- **Blackberry** — dark purple classic
- **Raspberry** — pink/green tech

Each gets `blur`, `opacity`, `tint`, `animation`, `saturateBoost`. New keyframes `glass-vibrant-pulse`, `glass-tech-shimmer`, `glass-retro-scan` added to `src/index.css`. All existing + new glass presets gain Dark / Light / Adaptive variants from §A.

---

## D. Adaptive Variant — Live Luminance Sampling

1. `public/live-skyview.html` listens for `postMessage({type:'sample-luminance'})`, draws current frame to offscreen canvas, returns `{type:'luminance', value:0..1}`.
2. New `src/contexts/LuminanceContext.tsx` polls every 30s, exposes EMA-smoothed `bgLuminance`.
3. Adaptive: Light scheme when `bgLuminance < 0.4`, Dark when `> 0.6`, smooth in between.
4. Fallback to 24h cosine if the iframe doesn't respond within 5s.

---

## E. FlightStats Scraper + Duration DB (replaces old tracker API)

**Drop AviationStack entirely.** New table `flight_routes`:
`flight_iata, flight_date, origin_iata, depart_local, depart_tz, arrive_local, arrive_tz, depart_at timestamptz, arrive_at timestamptz, duration_minutes int, codeshare bool default false, fetched_at`. PK `(flight_iata, flight_date)`. RLS: public SELECT, service-role only writes.

**New edge function `supabase/functions/scrape-flightstats/index.ts`:**
- Fetches `https://www.flightstats.com/v2/flight-tracker/arrivals/MLE/?codeshare=hidden` for today + tomorrow.
- Parses `__NEXT_DATA__` JSON; **skips rows where `isCodeshare === true`**.
- Computes duration with the **Simple Duration Method**:
  - Convert both to 24h minutes.
  - If `arrive < depart` → `arrive += 24h`.
  - `duration = arrive - depart`.
- Builds UTC `depart_at` / `arrive_at` using bundled IATA→tz lookup (MLE = `Indian/Maldives`).
- Upserts into `flight_routes`.

**Cron**: pg_cron `*/20 * * * *` calls the function (per existing `scrape-flights` pattern).

**Frontend `FlightProgressBar.tsx`**: queries `flight_routes` per `(flight_iata, flight_date)`. `progress = clamp((now - depart_at) / (arrive_at - depart_at), 0, 1)`. Plane stays at 0% before depart, locks at 100% at arrive. Falls back to existing scheduled-time heuristic when no row exists.

---

## F. Tracker Visual Upgrades + Flight-Card Glitch Fix

**`FlightProgressBar.tsx`:**
- Replace unicode `✈` with status-matched PNG plane icons placed in `src/assets/planes/{default,delayed,cancelled,landed}.png`.
- **Micro-animation layer** behind the plane, all flat-2D, semi-transparent (~25%), tinted with the card's status color:
  - Always-on: clouds, sun, moon, stars drifting slowly L→R.
  - **Weather-conditional**: lat/lng = `lerp(originLatLng, MLE_latLng, progress)`. Cached `get-weather` call (5-min). rain → drizzle; thunder → bolt; snow → flake; clear → sun/moon by hour.

**Flight-card glitch fix:**
- Removes the layout shift caused by `<img>` swapping size mid-render: plane icon now uses fixed `width:18px height:18px`, `object-fit:contain`, and is wrapped in a stable absolute-positioned span so changing icon at status change no longer reflows the card.
- Adds `key={status}` so React fully unmounts/remounts the icon (prevents broken-src flash).
- Cancels lingering `requestAnimationFrame` / interval timers in `FlightCard.tsx` cleanup to stop the "double-fade" glitch when a card status flips while expanded.

---

## G. Header Morph (per reference image 1)

**`src/components/NewHeader.tsx`:**
- Right corner gets a **plain Menu icon** (`Menu.png` from ImageKit, no orb background, no pill).
- On tap: icon **glows** (`box-shadow: 0 0 16px rgba(255,255,255,0.6)` keyframe `menu-icon-glow`), then **morphs into a dropdown menu panel** anchored under the icon (Refresh / Export / Notifications / Settings / Login-Logout / Admin if eligible) with a `scale-in + fade` animation. Tapping outside or the icon again reverses the morph.
- Existing horizontal pill removed; logo no longer toggles menu.
- Auto-collapse after 4s of inactivity preserved.

---

## H. Glass-Orb Sliders & Toggles (premium feel)

Use the **Toggle_Slider orb.png** asset (`Icons/Toggle_Slider.png` on ImageKit) as the visual thumb.

- `src/components/ui/slider.tsx`: thumb `background-image: url(Toggle_Slider.png)`, `background-size: cover`, soft glow shadow, no border.
- `src/components/SettingsModal.tsx` `LiveBlurToggle` + every Switch wrapper: knob uses the same image. Default Radix `<Switch>` is wrapped so the thumb shows the orb texture.
- Centralized in new `src/components/ui/glass-orb-thumb.tsx` for reuse.

---

## I. New UI Icons

`src/lib/cardStyles.ts` `UI_ICONS` extended with the latest icon pack URLs (menu, settings sliders, profile, font, bg, ui style, notifications, security, refresh, export, login/logout, admin, terminals, day/night/sunset/sunrise — already partly present; add any new ones from the provided ImageKit share). Replace any inline SVG in header / settings tab bar with these PNGs where the design reference uses them.

---

## J. New Fonts (added to backend + font list)

Copy uploaded font files into `public/fonts/`:
- Modulus Pro Semi-Bold, Visby Round CF, Arkitype Modulus Pro Bold (already present).
- New from latest upload set: **Arriva**, **Beyond**, **Compact**, **Pro Rounded**, **Suzuki**, **Toyota**, **Swatch** (use uploaded files when supplied; for any without a license file fall back to closest Google Fonts equivalent and label clearly).

`src/index.css`: add `@font-face` blocks with `font-display: swap`.
`src/contexts/SettingsContext.tsx` `AVAILABLE_FONTS`: append new entries plus Google Fonts options (Exo, Michroma, Aldrich, Khand, Saira Stencil One, Bruno Ace SC).
`usePreloadedFonts.ts`: re-apply `--app-font` whenever `fontFamily` changes — **no page reload needed**.

---

## K. Remove the requested texture

The texture URL provided in the message is removed everywhere it's referenced (`src/lib/cardStyles.ts` `TEXTURE_URLS`, `src/components/FlightCard.tsx`, `src/components/SkyIframeBackground.tsx` if any, and `public/live-skyview.html` if loaded). Any code paths fall back cleanly to gradient/solid backgrounds.

---

## L. Notifications: Persistent Prefs + Permission Toggle + Diagnostics + Test Send

- Migration: `ALTER TABLE profiles ADD COLUMN notification_prefs jsonb DEFAULT '{"push":false,"telegram":false,"email":false,"sms":false}'`.
- Settings → Notifications: each channel toggle writes to `profiles.notification_prefs` (localStorage as cache).
- **Push toggle** requests permission only when enabled; shows status badge (Granted/Denied/Default) + truncated subscriber ID. Disable → unsubscribe + clear `onesignal_player_id`.
- **DiagnosticsPanel.tsx** new "Notifications" section: browser permission, PushAlert subscriber ID, OneSignal player_id, last `notification_log.sent_at`, SW scope + version, Refresh button.
- **Admin Test Send**: new edge function `send-test-notification` — fires sample LANDED payload to admin's own subscriptions through existing `send-notification` pipeline (push + telegram + email + sms by their `notification_prefs`). Restricted via `has_role(auth.uid(),'admin')`.

---

## M. PWA, Service Worker, Install Flow, Permissions

**`public/sw.js`** — versioned with skipWaiting + clientsClaim before PushAlert import:
```js
const SW_VERSION = 'v3-2026-04-26';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.includes(SW_VERSION)).map(k => caches.delete(k))
  )).then(() => self.clients.claim())
));
importScripts("https://cdn.pushalert.co/sw-88425.js");
```

**New `src/lib/pwa.ts`:**
- Skip registration in iframes / preview hosts.
- On every standalone load: `register('/sw.js', {updateViaCache:'none'})` → `reg.update()`. New worker waiting → `postMessage({type:'SKIP_WAITING'})` → reload once.
- Sequentially request: `Notification.requestPermission()`, `navigator.storage.persist()`, background-sync where supported.

**New `src/components/InstallPrompt.tsx`:**
- Listens for `beforeinstallprompt`, stashes event.
- Detects already-installed via `matchMedia('(display-mode: standalone)')` / `navigator.standalone`. Hides if installed.
- Shows clear **"Install ARRIVA.MV"** CTA (replaces "Add Shortcut") only when eligible.
- iOS path: inline tutorial card.

**`public/manifest.json`** — add `id`, `scope: "/"`, `prefer_related_applications: false`, `screenshots[]` for rich Android dialog.

---

## N. Export Modal Format Toggle

`ExportModal.tsx` top toggle group:
- **Excel (sortable)** — XLSX with `HH:mm` cells.
- **Readable text** — `.txt` like `EK 652 — DXB → MLE — Sch 14:25 / Est 14:40 / T1 / LANDED`.

---

## O. Security Hardening

- All API keys / secrets stay server-side (Supabase secrets) — never in client bundle.
- New tables (`flight_routes`) get RLS: public SELECT only; writes via service role.
- Run `security--run_security_scan` at the end and remediate any new findings (mark the resolved ones via `manage_security_finding`).

---

## File Summary

| File | Change |
|------|--------|
| `src/lib/solidxStyles.ts` | NEW — 4 SolidX presets + Dark/Light schemes |
| `src/lib/luminance.ts` | NEW — luminance sampler |
| `src/lib/pwa.ts` | NEW — SW + install + permission flow |
| `src/contexts/SettingsContext.tsx` | SolidX state, new glass presets, fonts, notification_prefs |
| `src/contexts/LuminanceContext.tsx` | NEW — bgLuminance |
| `src/components/SettingsModal.tsx` | SolidX sub-section, opacity slider, push toggle, admin test, orb knobs |
| `src/components/FlightCard.tsx` | SolidX rendering, status tint, glitch fix, drop removed texture |
| `src/components/FlightProgressBar.tsx` | flight_routes lookup, PNG planes, micro-anim layer |
| `src/components/NewHeader.tsx` | Menu icon morph dropdown, no orb |
| `src/components/InstallPrompt.tsx` | NEW — install CTA |
| `src/components/DiagnosticsPanel.tsx` | Notifications diagnostic section |
| `src/components/AdminDashboard.tsx` | Send Test Landed button |
| `src/components/ExportModal.tsx` | Excel vs Readable toggle |
| `src/components/SkyIframeBackground.tsx` | postMessage luminance bridge, drop removed texture |
| `src/components/ui/slider.tsx` | Toggle_Slider orb thumb |
| `src/components/ui/glass-orb-thumb.tsx` | NEW — shared knob |
| `src/components/ui/switch.tsx` | Use glass-orb-thumb |
| `src/lib/cardStyles.ts` | New UI_ICONS, drop removed texture URL, drop parallax leftovers |
| `src/assets/planes/*.png` | NEW — 4 status planes |
| `public/fonts/*.otf` | NEW — Arriva/Beyond/Compact/Pro Rounded/Suzuki/Toyota/Swatch |
| `public/live-skyview.html` | luminance postMessage |
| `public/sw.js` | Versioned + skipWaiting/clientsClaim before PushAlert import |
| `public/manifest.json` | id, scope, screenshots |
| `src/index.css` | @font-face, new glass keyframes, menu morph keyframes, drop removed texture refs |
| `src/hooks/usePreloadedFonts.ts` | Re-apply font without reload |
| `supabase/functions/scrape-flightstats/index.ts` | NEW 20-min scraper |
| `supabase/functions/send-test-notification/index.ts` | NEW admin test sender |
| Migrations | `flight_routes` + RLS, `profiles.notification_prefs`, pg_cron schedule |
