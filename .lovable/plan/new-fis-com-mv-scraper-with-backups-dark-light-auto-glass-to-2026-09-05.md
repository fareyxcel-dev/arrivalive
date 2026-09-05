# New fis.com.mv Scraper (with backups) + Dark/Light/Auto Glass Tones + Tint Sliders

## Part 1 — Scraper for the redesigned fis.com.mv

The old HTML-table scraper gets nothing now because the site is a new Next.js app. Live inspection shows the data is available in cleaner forms than the old table. The "Compact list", "Int'l" and "Domestic" buttons in the screenshots are client-side filters over one dataset, so no panel interaction is needed.

Confirmed live sources (checked today):
1. `https://fis.com.mv/api/flights` — clean JSON: `{ flights: [...], lastUpdated }`, 175 records covering today + tomorrow, arrivals + departures, T1 international + T2 domestic. Fields: `flightNumber` ("SQ 432"), `airline`, `airlineCode`, `origin`, `originCode`, `scheduledTime`, `estimatedTime`, `terminal`, `status` (`on-time | landed | delayed | cancelled`), `type`, `category`, `date`, `delayMinutes`.
2. `https://fis.com.mv/` — same records embedded in the page's Next.js payload (regex + JSON parse).
3. `https://fis.com.mv/tv` — the FIDS TV view, also server-rendered with the same records.

Scraper chain in `scrape-flights` (each step only runs if the previous produced zero arrivals):
1. JSON API (`/api/flights`).
2. Embedded payload from `/`.
3. Embedded payload from `/tv`.
4. Legacy HTML-table parser (kept for safety).
5. Last-known good data already in the `flights` table for today/tomorrow (served with `source: "cache"` so the app never goes blank); mock data only if the table is empty too.

Normalisation (identical for sources 1–3):
- Keep `type === "arrival"` only; drop departures.
- Terminal from category exactly as requested: `international` -> **T1**, `domestic` -> **T2**.
- Skip codeshares (`primaryFlight` set).
- Status mapping to what the app already uses: `landed` -> `LANDED`, `delayed` -> `DELAYED`, `cancelled` -> `CANCELLED`, `on-time` and unknown -> `-`.
- `flight_id` keeps the "SQ 432" spacing (matches existing subscriptions/notifications), plus `airline_code`, `origin`, `scheduled_time`, `estimated_time`, `flight_date`.
- Sanity guard: a result is accepted only if it contains both T1 and T2 arrivals for today and at least 20 rows; otherwise fall through to the next source and log why. Row counts per terminal/date/status are logged on every run so a silent drop is visible in function logs.
- Status-change detection, upsert (`flight_id,flight_date`), notifications and `flight_alerts` stay unchanged.
- Add a `flightstats` cross-check log line (no data override) so any disagreement is visible during the switch.

## Part 2 — Glass tones for the whole UI: Dark, Light, Auto, Auto Reverse

A **Glass Tone** control in Settings -> Style with three buttons: **Dark**, **Light**, **Auto**. Tapping Auto while it is already selected flips it to **Auto Reverse** (button label/icon changes so the state is obvious).

- Dark = near-black tone, Light = near-white tone. Grey is removed as a standalone option and no preset may add its own grey shade.
- **Auto**: smoothly fades Light -> Dark from day to night, and Dark -> Light from night to day.
- **Auto Reverse**: the opposite — Dark by day, Light by night.
- The fade is a continuous 0–1 "daylight" value, not a hard switch. It comes from:
  - Real sunrise/sunset times for Male (already fetched by `get-weather-astronomy`) — civil twilight gives ~40-minute ramps around sunrise and sunset.
  - Live weather: overcast/rain/thunderstorm pull the daylight value down (e.g. heavy rain at noon reads as ~0.55, not 1.0), clear sky leaves it as-is.
  - Live background luminance sampled from the skyview iframe (`src/lib/luminance.ts`) blended in as a final correction so the glass always tracks what the sky actually looks like.
  - Updated every 30 s and eased with a 2 s CSS transition on the tone variables so changes are never abrupt.
- Text colour follows the tone continuously (white on dark, near-black on light, interpolated in between). Flight-card text palettes from card styles are untouched.
- All glass gradients become **opacity-based**: every gradient stop uses the same tone colour with only alpha changing, which removes muddy grey bands. Presets keep blur/animation/character; hue accents (Aero blue, Vista warm) become low-alpha overlays on top of the tone.
- SolidX styles and status-tinted opaque card backgrounds follow the same rule (single colour, alpha variations).

## Part 3 — Tint-strength sliders

Under the tone control:
- **Glass Tint** (0–100): 0 = nearly invisible (~2% alpha, border only, sky fully visible), 100 = fully opaque in the current tone.
- **Border Strength** (0–100): same range for borders/highlights.
- Live via CSS variables, persisted, migrated from the old Glass Opacity value (which is removed to avoid duplicate controls). Defaults: Tint 35, Border 40. Blur stays its own slider.

## Technical details

- `supabase/functions/scrape-flights/index.ts` — source chain, normaliser, sanity guard, cache fallback, per-run count logging; redeploy and verify T1/T2 counts against the live site for both dates.
- `src/lib/daylight.ts` (new) — computes the 0–1 daylight value from astronomy times, weather condition and iframe luminance; exposes a subscription hook.
- `src/contexts/SettingsContext.tsx` — `glassTone: 'dark' | 'light' | 'auto' | 'auto-reverse'`, `glassTint`, `glassBorderStrength`; writes `--glass-tone-l` (lightness), `--glass-text-l`, `--glass-tint`, `--glass-border-strength`; migration from `glassOpacity`; preset `tint` values replaced by tone + optional hue accent.
- `src/index.css` — rewrite `.glass*`, pills, orbs, neumorphic, toggle/slider, toast and preset overlays to `hsl(0 0% var(--glass-tone-l) / calc(var(--glass-tint) * k))`; 2 s transition on tone variables.
- `src/components/SettingsModal.tsx` — tone control with Auto/Auto Reverse toggle behaviour and the two sliders.
- `FlightCard.tsx`, `TerminalGroup.tsx`, `NewHeader.tsx`, `NotificationsModal.tsx`, `ExportModal.tsx` — replace remaining hardcoded white/black/grey surface values with tone variables.
- `public/live-skyview.html` — reply to the existing `sample-luminance` message if not already wired, so Auto has a real background reading.

Verification: run the scraper via the function endpoint and compare counts with the screenshots' pattern (T1 international, T2 domestic, both dates); simulate Auto at sunrise/noon/sunset/midnight and with rain/clear conditions; check tint 0 and 100 in each tone across header, cards, pills and modals.
