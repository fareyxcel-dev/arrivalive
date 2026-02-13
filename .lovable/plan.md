
# Comprehensive UI Polish: Glass Variants, Notifications, Header Fix, Flight Cards, and Settings

## Overview
This plan addresses unique glass preset animations, notification bell visual fixes, header weather text alignment, flight card expanded row updates, airline logo matching improvements, settings UI improvements (fonts, dual glass, sliders/toggles), and more live blur gradience across UI elements.

---

## 1. Unique Glass Preset Variants with Animations

**Files: `src/contexts/SettingsContext.tsx`, `src/index.css`**

Each glass preset gets unique visual properties beyond just blur/opacity. Add `tint`, `borderStyle`, `animation`, and `saturate` fields to each preset definition:

| Preset | Blur | Opacity | Tint | Animation | Extra |
|--------|------|---------|------|-----------|-------|
| Frosted | 20 | 0.08 | white | Subtle shimmer (slow sweeping light) | saturate(1.1) |
| Liquid | 35 | 0.05 | none | Ripple distortion pulse (CSS scale oscillation) | saturate(1.4) |
| Prismatic | 12 | 0.06 | rainbow | Rainbow border gradient rotation | hue-rotate animation |
| Stained | 18 | 0.15 | amber | Warm color pulse | sepia tint |
| Polarized | 25 | 0.10 | cold-blue | Glitch flash every 8s | contrast(1.2) |
| iOS | 25 | 0.08 | none | Vibrancy bounce on appear | saturate(1.8) |
| Aero | 14 | 0.20 | blue-tint | Glass reflection sweep (existing glass-shine) | none |
| Vista | 8 | 0.25 | green-tint | Thick glass wobble | brightness(1.1) |
| Windows | 18 | 0.12 | noise | Acrylic noise texture overlay | noise pseudo-element |
| Linux | 4 | 0.04 | none | Terminal cursor blink on border | minimal |
| Mac | 22 | 0.07 | warm | Vibrancy fade-in | saturate(1.3) |
| Ubuntu | 10 | 0.18 | orange | Warm glow pulse | orange border-glow |

Additionally add more presets from reference image 4: **Nintendo, PlayStation, Xbox, ROG, Nokia, Samsung, iPhone, BlackBerry, Raspberry, Steam** (each with unique tint/animation).

### CSS Implementation
- Add keyframe animations per preset (e.g., `@keyframes glass-prismatic-rotate`, `@keyframes glass-liquid-ripple`)
- In `SettingsContext.tsx`, expand the `GLASS_PRESETS` type to include `tint: string`, `animation: string`, `saturateBoost: number`
- When a preset is selected, inject the animation class name into the global style sheet alongside blur/opacity

---

## 2. Notification Bell Fix - Remove Pulse Animation Confusion

**File: `src/components/FlightCard.tsx`**

### Problem
The bell pulses periodically for ALL bells (active and inactive), making it impossible to distinguish active from inactive.

### Fix
- Remove the periodic `bellPulse` animation entirely (delete the `useEffect` that sets up `pulseInterval`)
- Active bell: Full opacity (1.0), glowing silhouette (`filter: drop-shadow(0 0 8px color)`), `BellRing` icon, bright background tint
- Inactive bell: Reduced opacity (0.5), no glow, plain `Bell` icon, no background
- This makes active/inactive instantly distinguishable without any pulsing

### Changes to `BellButton` component
- Remove `isPulsing` prop entirely
- Active state: `opacity: 1`, `boxShadow: 0 0 12px glow, 0 0 20px glow`, `background: rgba(color, 0.15)`
- Inactive state: `opacity: 0.5`, no shadow, transparent background

---

## 3. Header Weather Text Alignment Fix

**File: `src/components/NewHeader.tsx`**

### Problem (Reference Image 2)
The default weather text ("CLOUDS" / "FOR NEXT 3H 22M") is rendering in the wrong position -- it appears overlapping/displaced from the right column into the center logo area.

### Root Cause
The weather text container uses `showForecast && "blur-sm opacity-0"` to hide default text when showing alternative, but the default text positioning itself is not constrained properly. The absolute positioning of the forecast text doesn't replace the default text layout correctly.

### Fix
- Change both default and alternative weather text to share the same container using conditional rendering (no `absolute` positioning)
- Remove the `blur-sm opacity-0` approach -- instead use a simple ternary: show either default text OR forecast text, never both
- Add `text-right` and proper `justify-end` alignment
- Apply adaptive-shadow to all weather text elements
- Ensure `max-w-[35vw]` constraint is enforced on the right column container

```tsx
// Instead of two overlapping buttons with absolute positioning:
<button onClick={handleWeatherClick} className="block text-right ...">
  <p className="font-bold text-white ...">
    {showForecast ? upcomingRow1 : weatherDurationRow1}
  </p>
  <p className="font-medium text-white/70 ...">
    {showForecast ? upcomingRow2 : weatherDurationRow2}
  </p>
</button>
```

This eliminates the absolute positioning issue entirely.

---

## 4. Extended Flight Card: Always Show SCH / Tracker / EST

**File: `src/components/FlightCard.tsx`, `src/components/FlightProgressBar.tsx`**

### Current Behavior
- Landed cards show "LND" label on right
- Cancelled cards show "CNL" label on right and "Cancelled" text inside empty bar

### Updated Behavior
- ALL expanded cards always show: `SCH {time}` on left, progress bar in center, `EST {time}` on right
- For **landed** status: The countdown text inside the progress bar is replaced with the actual landed time (formatted)
- For **cancelled** status: The countdown text inside the progress bar is replaced with the actual cancelled time (formatted)
- The `rightLabel` prop is no longer needed -- always show "EST"
- The right side always shows `estimatedTimeFormatted`

### FlightProgressBar Changes
- Add new prop `centerText?: string` that overrides the countdown display
- When `status === 'LANDED'`, parent passes `centerText={estimatedTimeFormatted}` (the landed time)
- When `status === 'CANCELLED'`, parent passes `centerText={estimatedTimeFormatted}` (the cancellation time)
- For cancelled, still show the empty bar but with the time centered
- Make the cancelled bar visible (currently returns null via `isVisible` check)

---

## 5. Airline Logo IATA Code Matching Fix

**File: `src/components/FlightCard.tsx`**

### Problem
Some logos (H4, OQ, C6, HB, FD, MF) aren't being matched because the airline name in `AIRLINE_NAMES` doesn't match the filename format in the ImageKit directory.

### Fix
- Add missing entries to `AIRLINE_NAMES`:
  - `'H4': 'HiSky Europe'`
  - `'OQ': 'Chongqing Airlines'`
  - `'C6': 'Centrum Air'`
  - `'HB': 'Greater Bay Airlines'`
  - `'MF': 'XiamenAir'`
- `FD` is already mapped to `'Thai AirAsia'` but the URL uses `Thai%20AirAsia` -- verify the URL pattern handles this (the `encodeURIComponent` should work but `AirAsia` vs `Air Asia` might mismatch). Fix: change `'FD': 'Thai AirAsia'` in the mapping (no space between Air and Asia, matching the filename).
- Also update `'AK': 'Air Asia'` to match the logo filename `AK (Air Asia).png` -- this one has a space so keep it

### Airline Name Click
When clicking a logo that shows the IATA code fallback (no logo found), it should still show the full airline name from `AIRLINE_NAMES`. This already works via the `handleLogoClick` function.

---

## 6. Settings: Font Styles Visible During Scroll

**File: `src/components/SettingsModal.tsx`**

### Problem (Reference Image 3)
Each font name in the font list should render in its actual typeface (e.g., "OSWALD" in Oswald, "BEBAS NEUE" in Bebas Neue).

### Current Implementation
Uses `IntersectionObserver` to lazy-load fonts, and applies `fontFamily` via inline style only when `visibleFonts.has(font)`.

### Fix
The `IntersectionObserver` setup has a timing issue -- it's set up in a `useCallback` with `visibleFonts` as a dependency, which causes the observer to be recreated and miss elements. Fix:
- Remove `visibleFonts` from the `useCallback` dependency array (the observer should persist)
- Use a `ref` (`Set`) instead of state for tracking visible fonts to avoid re-renders breaking the observer
- Always apply `fontFamily: font` to the button style (don't conditionally check `visibleFonts.has(font)`) -- the browser will use the fallback until the font loads
- Load the font CSS link as soon as the element intersects (keep this behavior)

---

## 7. Settings: Dual Glass Scrollable Grid (Reference Image 4)

**File: `src/components/SettingsModal.tsx`**

### Current Implementation
Dual glass uses two `<select>` dropdowns. The glass presets are a 3-column grid.

### Updated Implementation
- When dual glass is ON, show "Primary Glass" label above the existing preset grid, and "Secondary Glass" label below with a second grid
- Both grids are scrollable within the modal's scroll area
- The selected preset in each grid gets a highlighted border (`border-white/40`)
- Show the blend result label: `{Style1.label} + {Style2.label}`
- Add more presets (Nintendo, PlayStation, Xbox, ROG, Nokia, Samsung, iPhone, BlackBerry, Raspberry, Steam) to total ~22 presets

---

## 8. Settings: Glass Sliders and Toggles

**File: `src/components/SettingsModal.tsx`, `src/index.css`**

### Problem
Current sliders and toggles use default Radix styling with black/grey fills.

### Fix (Already Partially Done)
The `LiveBlurToggle` component already uses backdrop-filter. The Radix slider overrides in `index.css` already set glass-styled tracks/thumbs. Verify and enhance:
- Slider track: `rgba(255,255,255,0.08)` with `backdrop-filter: blur(6px)`, inset shadow
- Slider range (filled): `rgba(255,255,255,0.18)` with `backdrop-filter: brightness(1.4)`
- Slider thumb: `rgba(255,255,255,0.5)` with glass border and shadow
- These CSS overrides already exist in `index.css` -- verify they're being applied (check for specificity issues with Radix data attributes)

---

## 9. More Live Blur Gradience in UI Elements

**File: `src/index.css`**

### Enhancements
- **Buttons**: All interactive buttons get `backdrop-filter: blur(8px) brightness(varies)` -- brighter on hover, darker on press
- **Menu pill**: Already has blur. Add brightness variation: collapsed = `brightness(0.8)`, expanded = `brightness(1.2)`
- **Icons in header**: Add subtle `backdrop-filter` halos behind each icon
- **Toast notifications**: Already have glass styling. Add brightness gradient: `brightness(1.1)` on success, `brightness(0.9)` on error
- **Terminal group headers**: Add `brightness(1.05)` to distinguish from body
- **Status badges in flight cards**: Add `backdrop-filter: blur(6px) brightness(1.2)` for brighter appearance

### CSS Updates
Add/update these utility styles:
```css
.glass-interactive {
  backdrop-filter: blur(12px) brightness(1.0);
}
.glass-interactive:hover {
  backdrop-filter: blur(12px) brightness(1.3);
}
.glass-interactive:active {
  backdrop-filter: blur(12px) brightness(0.8);
}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/contexts/SettingsContext.tsx` | Expand GLASS_PRESETS with tint/animation/saturate fields, add ~10 more presets |
| `src/index.css` | Add per-preset animation keyframes, enhance glass-interactive brightness, update slider overrides |
| `src/components/FlightCard.tsx` | Remove bell pulse animation, fix airline name mappings, always show SCH/EST in expanded row |
| `src/components/FlightProgressBar.tsx` | Add `centerText` prop for landed/cancelled time display, show bar for cancelled |
| `src/components/NewHeader.tsx` | Fix weather text alignment using conditional rendering instead of absolute positioning |
| `src/components/SettingsModal.tsx` | Fix font observer, expand dual glass to grid UI, add more presets to grid |
