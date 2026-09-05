# New fis.com.mv Scraper + Dark/Grey/Light Glass Tones with Tint-Strength Sliders

## Part 1 — Scraper for the redesigned fis.com.mv

The new fis.com.mv is a Next.js app. The "Compact list", "Arrivals + Int'l" and "Arrivals + Domestic" views in the side panel are just client-side filters over one dataset — the full flight list for today and tomorrow is already embedded as JSON in the page HTML on first load (176 records at the time of inspection: arrivals and departures, T1 international and T2 domestic, with fields `flightNumber`, `airline`, `airlineCode`, `origin`, `originCode`, `scheduledTime`, `estimatedTime`, `terminal`, `status`, `type`, `category`, `date`, `delayMinutes`). No panel interaction or headless browser is needed.

What the updated `scrape-flights` function will do:
- Fetch `https://fis.com.mv/` with a browser User-Agent.
- Extract every embedded `{"id":"arrival-…"}` record from the Next.js payload (regex + JSON parse), ignoring `departure-*` records.
- Keep only `type === 'arrival'`, and split by category exactly as requested: `international` -> **T1**, `domestic` -> **T2** (terminal set from the category, not trusted from the record, so the grouping stays stable).
- Skip codeshares: any record whose `primaryFlight` is set (currently none appear, but the guard stays).
- Map fields to the existing `flights` table columns: `flight_id` = "SQ 432", `airline_code`, `origin`, `scheduled_time`, `estimated_time`, `flight_date`, `terminal`.
- Map statuses to the values the app already understands: `landed` -> `LANDED`, `delayed` -> `DELAYED`, `cancelled` -> `CANCELLED`, `on-time`/anything else -> `-`. `delayMinutes` is appended as extra context on delayed flights (e.g. estimated time already reflects it; nothing else in the UI changes).
- If the payload yields zero arrivals, fall back to the old HTML-table parser (kept as a secondary path) before returning mock data, so a temporary layout change never blanks the app.
- Status-change detection, upsert, notifications and `flight_alerts` logic stay unchanged.

## Part 2 — Dark / Grey / Light glass tones for the whole UI

Add a **Glass Tone** selector (Dark, Grey, Light) in Settings -> Style that applies to every glass surface: header, menu dropdown, terminal groups, flight cards, pills, modals, sliders/toggles, toasts.

- Each tone defines a single base colour via CSS variables: Dark = near-black, Grey = neutral mid-grey, Light = near-white. No preset or gradient may introduce its own grey shade any more.
- All glass gradients become **opacity-based**: every gradient stop uses the same tone colour and only its alpha changes (e.g. `hsl(var(--glass-tone) / calc(var(--glass-tint) * 1.0))` -> `… * 0.6`). This removes the muddy grey bands that appeared in light/dark styles.
- Existing 15 glass presets keep their blur, animation and character, but their `tint` colours are replaced by tone-driven values (a preset can still add a subtle hue accent like Aero's blue, applied as a low-alpha overlay on top of the tone, never a grey shade).
- Text colours auto-flip for readability: Light tone uses dark text (`--foreground` dark, 80% variant), Dark/Grey keep white / white-80%. Flight card text colours (per card style) are unaffected.
- SolidX styles follow the tone too, since they share the same variables.
- Status-tinted opaque card backgrounds (landed/delayed/cancelled at 0% opacity) stay colour-based by design, but their gradient stops become alpha variations of one status colour rather than three different shades.

## Part 3 — Tint-strength sliders

In Settings -> Style, under the tone selector:
- **Glass Tint** slider (0–100): drives `--glass-tint`. At 100 the glass is fully opaque in the chosen tone (background completely hidden). At 0 the glass is almost invisible (~2% alpha, border only) so the sky background shows through nearly untouched.
- **Border Strength** slider (0–100): same idea for glass borders/highlights so they can also fade out or become crisp.
- Both are live (CSS variables set from `SettingsContext`), persisted in settings, and included in the existing settings migration with sensible defaults (Tint 35, Border 40). The existing Glass Opacity slider is folded into Glass Tint to avoid two overlapping controls; old saved values migrate automatically.
- Blur stays a separate slider as today.

## Technical details

Files:
- `supabase/functions/scrape-flights/index.ts` — new payload parser, category->terminal mapping, status mapping, legacy parser fallback; redeploy.
- `src/index.css` — introduce `--glass-tone`, `--glass-tint`, `--glass-border-strength`, `--glass-text`, `--glass-text-muted`; rewrite `.glass`, `.glass-strong`, `.glass-blur-strong`, `.glass-pill`, `.glass-orb`, `.glass-neumorphic`, toggle/slider styles, toast styles and all preset overlays to opacity-only gradients using these variables; add `[data-glass-tone="dark|grey|light"]` blocks.
- `src/contexts/SettingsContext.tsx` — add `glassTone`, `glassTint`, `glassBorderStrength`; set `data-glass-tone` on `<html>` and the CSS variables; migrate `glassOpacity` -> `glassTint`; strip grey `tint` values from `GLASS_PRESETS` in favour of tone + optional hue accent.
- `src/components/SettingsModal.tsx` — tone segmented control (Dark/Grey/Light) and the two sliders in the Style tab; remove the standalone glass opacity slider.
- `src/components/FlightCard.tsx`, `TerminalGroup.tsx`, `NewHeader.tsx`, `NotificationsModal.tsx`, `ExportModal.tsx` — replace any remaining hardcoded `rgba(255,255,255,…)` / `rgba(0,0,0,…)` / hex grey surface values with the tone variables so the tone switch is complete.
- `src/lib/cardStyles.ts` — no change to logo/text palettes.

Verification: run the updated scraper against the live site and confirm T1 = international arrivals, T2 = domestic arrivals for both dates; check preview at each tone with tint at 0 and 100 across header, cards, pills and modals.
