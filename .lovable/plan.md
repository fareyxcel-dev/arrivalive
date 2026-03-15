

# Comprehensive UI Overhaul: Header, Flight Cards, Filters, Settings, Glass Styles, Gradients

## Overview
11 distinct changes across header behavior, flight card layout, filter system, settings restructuring, glass variant replacement, status color animations, text adjustment sliders, progress bar theming, and gradient text effects.

---

## 1. Header Logo Click → Toggle Menu Pill

**File: `src/components/NewHeader.tsx`**

- Change the header logo `<button onClick={onInstallPWA}>` (line 331-343) to `onClick={() => setIsMenuOpen(!isMenuOpen)}`
- Remove the separate menu pill button's click handler since the logo now controls it
- Keep the small pill indicator visible below logo but remove its own click toggle (it becomes a passive visual indicator of menu state)

---

## 2. Flight Card: Flight ID + Origin on Same Row, Origin Bold

**File: `src/components/FlightCard.tsx`**

Change lines 240-250 from stacked layout to inline:
```tsx
<div className="flex items-center gap-1.5 min-w-0 flex-1">
  <span className="text-sm leading-tight truncate adaptive-shadow"
    style={{ color: theme.textColor, opacity: 0.9 }}>
    {flight.flightId}
  </span>
  <span className="font-bold text-sm truncate leading-tight adaptive-shadow"
    style={{ color: theme.textColor, opacity: 0.9 }}>
    {flight.origin}
  </span>
</div>
```

---

## 3. Filter: Add "Full" Option for Complete Schedule

**File: `src/components/TerminalGroup.tsx`**

Add a third filter toggle "Full" in the filter pill that, when active, shows all flights including those normally removed by the 60-minute post-landing/cancellation cleanup.

- Add `showFull` local state alongside `hideCancelled`/`hideLanded`
- Pass `showFull` down or emit it up so `Index.tsx` can include removed flights in the data
- Actually, since removed flights are already filtered out before reaching TerminalGroup, this requires:
  - Adding a `fullScheduleFlights` prop to TerminalGroup (the unfiltered list before time-based removal)
  - When `showFull` is true, use `fullScheduleFlights` instead of `flights`
- Add "Full" chip in the filter pill next to Cancelled/Landed

**File: `src/pages/Index.tsx`**
- Keep a separate `allFlights` state that stores every flight from the API without the 60-min removal filter
- Pass both `flights` (filtered) and `allFlights` (full) to TerminalGroup

---

## 4. Airline Logo Click → 2-Row Airline Name Display

**File: `src/components/FlightCard.tsx`**

Change `handleLogoClick` display (lines 222-228): instead of showing airline name in a pill, split the airline name into 2 rows within the same width container (42px):
```tsx
{showAirlineName ? (
  <div className={cn("flex items-center justify-center w-[42px] h-[38px] transition-opacity duration-300", isFadingOut && "opacity-0")}>
    <span className="text-[7px] font-medium text-center leading-tight block adaptive-shadow break-words"
      style={{ color: theme.textColor, opacity: 0.9, maxWidth: '42px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
      {airlineName}
    </span>
  </div>
) : ( ... )}
```

---

## 5. Settings Cards Tab: Replace Flight Filters with Visual Sliders

**File: `src/components/SettingsModal.tsx`**

Replace the Flight Filters section (lines 478-497) with card-level visual adjustment sliders:
- Card Logo Brightness (0-200%, default 100%)
- Card Logo Contrast (0-200%, default 100%)
- Card Logo Saturation (0-200%, default 100%)
- Card Logo Hue Shift (0-360°, default 0°)
- Card Text Brightness (0-200%, default 100%)
- Card Text Saturation (0-200%, default 100%)

**File: `src/contexts/SettingsContext.tsx`**
Add new settings: `cardLogoBrightness`, `cardLogoContrast`, `cardLogoSaturation`, `cardLogoHueShift`, `cardTextBrightness`, `cardTextSaturation`

**File: `src/components/FlightCard.tsx`**
Apply CSS filter to airline logo `<img>`: `filter: brightness(${}) contrast(${}) saturate(${}) hue-rotate(${})` from settings.
Apply brightness/saturation adjustments to text colors.

---

## 6. Replace Glass Variants in Style Settings

**File: `src/contexts/SettingsContext.tsx`**

Replace all current 22 GLASS_PRESETS with exactly 12 new ones:
1. **Frosted Glass** - blur:20, white frost overlay shimmer
2. **Liquid Glass** - blur:35, ripple distortion effect
3. **Faceted Prismatic** - blur:12, rainbow border rotation
4. **Faceted Glass** - blur:16, multi-face reflections
5. **Metallic** - blur:8, chrome-like reflection sweep
6. **Beveled Solid** - blur:4, hard-edge bevel with shadow
7. **iOS Liquid Glass** - blur:28, high vibrancy bounce
8. **Windows Aero** - blur:14, blue-tint glass reflection sweep
9. **Android Material** - blur:18, material elevation ripple
10. **Opaque** - blur:0, solid frosted background
11. **Retro Pixelated** - blur:2, pixel-grid overlay effect
12. **Clear** - blur:0, fully transparent, no effects

Each must have unique `tint`, `animation`, `saturateBoost`, `blur`, and `opacity` values. They should be visually distinct and support Dual Glass blending.

---

## 7. Status Color Visual Presence on Card Backgrounds + Animations

**File: `src/components/FlightCard.tsx`**

Increase the status color intensity in the card background:
- Change `rgba(${hexToRgb(theme.cardTint)}, 0.08)` to `0.15` for status cards
- Add a subtle animated glow/pulse for status cards using CSS animation
- For Glass styles: add a faceted shimmer overlay
- For Gradient styles: add animated gradient sweep
- Combined (Glass+Gradient): both effects layered

Add CSS keyframes in `src/index.css`:
```css
@keyframes status-pulse { 0%,100% { opacity:0.12 } 50% { opacity:0.22 } }
@keyframes glass-shimmer { 0% { background-position:-200% } 100% { background-position:200% } }
@keyframes gradient-sweep { 0% { background-position:0% 0% } 100% { background-position:100% 100% } }
```

---

## 8. Text Settings: Replace Color Shift with Sliders

**File: `src/components/SettingsModal.tsx`**

Replace the Color Shift slider (lines 360-366) with:
- Text Brightness (0-200%, default 100%)
- Text Contrast (0-200%, default 100%)
- Text Saturation (0-200%, default 100%)
- Text Hue Shift (0-360°, default 0°)
- Text Drop Shadow X, Y, Blur, Opacity

**File: `src/contexts/SettingsContext.tsx`**
Replace `colorShift` with: `textBrightness`, `textContrast`, `textSaturation`, `textHueShift`, `textShadowX`, `textShadowY`, `textShadowBlur`, `textShadowOpacity`

Apply globally via CSS custom properties on the root element.

---

## 9. Flight Tracker Progress Color Matches Card Theme

**File: `src/components/FlightCard.tsx`** — Already passes `theme.progressActive` and `theme.progressInactive` to `FlightProgressBar`. These are derived from `textColor` in `getCardTheme()`. This is already working correctly. Verify no changes needed.

---

## 10. Gradient Text on Gradient Card Styles

**File: `src/components/FlightCard.tsx`**

When `theme.isGradient && theme.gradientColors`, apply CSS gradient text to ALL text elements:
```tsx
const gradientTextStyle = theme.gradientColors ? {
  background: `linear-gradient(to bottom, ${theme.gradientColors[0]}, ${theme.gradientColors[1]}, ${theme.gradientColors[2]})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} : { color: theme.textColor };
```

Apply this style to: flight ID, origin, status badge, time, SCH/EST labels, countdown text.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/NewHeader.tsx` | Logo click toggles menu pill |
| `src/components/FlightCard.tsx` | Same-row flight ID + bold origin; 2-row airline name; gradient text; status animations; card visual sliders applied |
| `src/components/TerminalGroup.tsx` | Add "Full" filter option |
| `src/pages/Index.tsx` | Pass full unfiltered flights to TerminalGroup |
| `src/components/SettingsModal.tsx` | Card visual sliders replace filters; text sliders replace color shift; new glass presets grid |
| `src/contexts/SettingsContext.tsx` | Replace 22 glass presets with 12; add card/text visual adjustment settings; remove colorShift |
| `src/index.css` | Status pulse/shimmer/sweep keyframes |
| `src/lib/cardStyles.ts` | No changes needed |

