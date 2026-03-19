

# Updated Plan: All Previous Changes + White UI Text

This plan incorporates all 13 changes from the previously approved plan, plus one additional change:

## Additional Change: White UI Text (Non-Flight-Card)

**Problem:** Current UI uses grayish text (`--foreground: 150 6% 87%` and `--muted-foreground: 0 0% 55%`) for headers, labels, stats, date dividers, settings, and other non-flight-card text.

**Fix in `src/index.css`:**
- Change `--foreground` from `150 6% 87%` to `0 0% 100%` (pure white, rendered at 100% opacity)
- Change `--muted-foreground` from `0 0% 55%` to `0 0% 100%` with 80% opacity approach — actually since CSS variables are used via `hsl()`, set `--muted-foreground: 0 0% 80%` to approximate white at 80% opacity on dark backgrounds
- Change `--card-foreground` from `150 6% 87%` to `0 0% 100%`
- Change `--popover-foreground` from `150 6% 87%` to `0 0% 100%`
- Change `--secondary-foreground` from `150 6% 87%` to `0 0% 100%`

Additionally in components that use hardcoded `text-white/60`, `text-white/50`, `text-white/40` for secondary UI text (TerminalGroup stats line, date divider counts, filter labels), bump those to `text-white/80` for consistency.

This does NOT affect flight card text — those use inline `style={{ color: theme.textColor }}` from cardStyles.ts, which bypasses CSS variables entirely.

---

## All Other Changes (from approved plan)

1. **Card text/logo visibility** — ensure brightness/contrast/saturation defaults make text visible on all backgrounds
2. **Font colors match logo colors** — already matched; add unified slider toggle
3. **Progress bar uses theme colors** — increase `trackActiveColor` opacity from 0.7 to 0.85; remove any white overrides
4. **Opaque cards at glass opacity=0** — solid hex backgrounds with faceted texture per status
5. **Diamond glass card style** — new `'diamond'` entry with gemstone tones and faceted polygon animation
6. **Remove bell circle container** — remove `glass-orb` class and background from BellButton
7. **Illuminate status badges** — add `textShadow` glow with status color
8. **Terminal logos and renamed labels** — T1→icon+"International Terminal (T1)", T2→icon+"Domestic Terminal (T2)"
9. **Airline name fixes** — add `SG: 'SpiceJet'`, verify `JD` mapping
10. **Notification pipeline** — already gracefully handles preview; no code changes needed
11. **Gradient text matches gradient logos** — apply `textStyle` to SCH/EST labels (currently using `plainTextStyle`)
12. **Unified card adjustment toggle** — `cardUnifiedAdjust` setting linking logo+text sliders
13. **Status animation keyframes** — add missing CSS for `status-pulse-anim`, `status-glass-shimmer`, `status-gradient-sweep`, `status-combined-anim`, `diamond-facet-anim`

## Files to Change

| File | Changes |
|------|---------|
| `src/index.css` | Update CSS variables for white text; add missing status/diamond keyframes |
| `src/lib/cardStyles.ts` | Add `'diamond'` card style; add `SG: 'SpiceJet'` |
| `src/components/FlightCard.tsx` | Remove bell glass-orb; opaque fallback; diamond facets; illuminated badges; gradient on SCH/EST; unified slider filter; progress bar opacity fix |
| `src/components/FlightProgressBar.tsx` | Ensure theme colors used, increase active opacity |
| `src/components/TerminalGroup.tsx` | Terminal icons + renamed labels; bump secondary text to `text-white/80` |
| `src/contexts/SettingsContext.tsx` | Add `cardUnifiedAdjust` setting; add `'diamond'` to card styles |
| `src/components/SettingsModal.tsx` | Add unified toggle for card sliders |

