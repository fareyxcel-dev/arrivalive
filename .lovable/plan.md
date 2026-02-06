

# Comprehensive UI Enhancement Plan

## Overview
This plan covers 12 distinct feature areas: header weather text rephrasing, airline logo fetching, flight card status/bell redesign, monochrome advanced controls, new glass presets, dual glass style toggle, modal redesign, admin tab in settings, font list auto-scroll, and automatic flight filtering by time.

---

## 1. Header Weather Text Shortening

**File: `src/components/NewHeader.tsx`**

### Default Right-Side Text (Row 1 + Row 2)
Current: "Rain with thunderstorm all day" / "20% chance of rain"
New format:
- Row 1: Just the condition name (e.g., "Thunderstorm")
- Row 2: "For next {Xh Ym}" (duration until weather changes, or "All day" if no change)

### Alternative Text (on click, 30s revert)
Current: "Partly cloudy in 3h 20m" / "at 8:00am"
New format:
- Row 1: "Expect: {NextCondition}"
- Row 2: "Around {time}"

### Remove Menu Symbols
- Remove the chevron characters (^ and v) from the pill menu button entirely
- The pill itself still opens/closes on click, but no arrow indicator is shown
- The pill remains visually identifiable as interactive via its glass styling

### Implementation
- Modify `getWeatherDuration()` to return just condition name on row 1 and "For next Xh Ym" on row 2 (or "All day")
- Modify `getUpcomingWeatherText()` to return "Expect: {condition}" on row 1 and "Around {time}" on row 2
- Split these into separate row variables instead of single-line strings
- Remove the `<span>` elements containing `˅` and the rotated `˅` from the menu button JSX

---

## 2. Airline Logo Directory Search with Retry

**File: `src/components/FlightCard.tsx`**

When no airline logo is found via the current URL patterns, implement a periodic retry mechanism:

### Logic
- If all URL patterns fail (current behavior shows airline code text), instead of giving up permanently:
  - Set a 30-minute interval timer to re-check the ImageKit directory URL
  - Construct the search URL using the IATA code from the flight ID (first 2 characters)
  - On each retry, attempt all URL patterns again
  - If found, update the component state to show the logo
  - Clear the interval once found or when component unmounts

### Implementation
- Add a `useEffect` with `setInterval(30 * 60 * 1000)` that resets `imageError` to false and `urlIndex` to 0
- The existing `onError` cascade will re-try all URL patterns
- Add the public share URL as an additional fallback pattern in `getUrlPatterns()`

---

## 3. Flight Card Status Badge and Bell Redesign

**File: `src/components/FlightCard.tsx`**

### Bell Icon Changes
- Vertically center the bell in its grid cell using `items-center` (already partly done)
- Remove bell entirely for LANDED and CANCELLED flights (already partially implemented, needs enforcement)

### Status Badge Behavior (Right Column, Rows 1-2)
The right column will show a **vertically centered** status area spanning rows 1-2:

**When collapsed (not expanded):**
- **No status** (scheduled/on-time): Show estimated time only (80% opacity), no badge. Clicking expands.
- **Delayed**: Show "DELAYED" badge + delayed arrival time below it. Clicking expands.
- **Cancelled**: Show "CANCELLED" badge + cancellation time below it. Clicking expands.
- **Landed**: Show "LANDED" badge + landed time below it. Clicking expands.

**When expanded:**
- Remove the status badge and time text completely from right column rows 1-2
- Show the full bottom section (rows 3-4): scheduled time, flight tracker, and estimated time
- Flight tracker shows landed time or cancelled time instead of "Estimated" label when applicable

### Flight Tracker Label Updates
- When LANDED: Right label says "Landed" instead of "Estimated", showing the landed time
- When CANCELLED: Right label says "Cancelled", showing the cancellation time
- Otherwise: Right label stays "Estimated"

---

## 4. Monochrome Advanced Controls

**File: `src/components/SettingsModal.tsx`** and **`src/contexts/SettingsContext.tsx`**

When monochrome toggle is ON, show additional sliders:

### New Settings State Properties
```
monoContrast: number    // 50-150, default 100
monoShadows: number     // 0-100, default 50
monoHighlights: number  // 0-100, default 50
```

### New Sliders (visible only when monochrome is ON)
- Brightness (already exists as iframeBrightness)
- Contrast (50-150%)
- Shadows (0-100)
- Highlights (0-100)

### CSS Filter Application
In `SkyIframeBackground.tsx`, build the filter string:
```
grayscale({intensity}%) brightness({brightness}%) contrast({contrast}%)
```
Shadows and highlights applied via additional CSS filter or SVG filter.

---

## 5. New Glass Style Presets

**File: `src/components/SettingsModal.tsx`** and **`src/contexts/SettingsContext.tsx`**

Replace current 10 presets with OS/design-inspired glass styles:

| Preset | Blur | Opacity | Description |
|--------|------|---------|-------------|
| Frosted | 20px | 0.08 | Standard frosted glass |
| Liquid | 30px | 0.12 | Fluid, high-blur glass |
| Prismatic | 15px | 0.06 | Rainbow refraction feel |
| Stained | 18px | 0.15 | Colored glass tint |
| Polarized | 22px | 0.10 | Sharp contrast glass |
| iOS | 25px | 0.08 | Apple-style frosted |
| Aero | 12px | 0.20 | Windows Aero translucency |
| Vista | 8px | 0.25 | Subtle Vista glass |
| Windows | 16px | 0.18 | Modern Windows acrylic |
| Linux | 5px | 0.05 | Minimal, clean |
| Mac | 20px | 0.07 | macOS vibrancy |
| Ubuntu | 10px | 0.22 | Ubuntu desktop feel |

Update the preset selector grid in the Style tab.

---

## 6. Dual Glass Style Toggle

**File: `src/components/SettingsModal.tsx`** and **`src/contexts/SettingsContext.tsx`**

### New Settings
```
dualGlass: boolean          // default false
dualGlassStyle1: string     // first preset id
dualGlassStyle2: string     // second preset id
```

### UI
- Add a "Dual Glass" toggle switch in the Style tab
- When ON, show two preset selectors side by side
- The resulting glass effect is a 50/50 blend of both presets' blur and opacity values:
  - `blendedBlur = (preset1.blur + preset2.blur) / 2`
  - `blendedOpacity = (preset1.opacity + preset2.opacity) / 2`

### Application
- In the CSS variable injection (SettingsContext), when dualGlass is enabled, compute blended values and apply them instead of single preset values

---

## 7. Modal Redesign to Match Terminal Group Containers

**Files: `SettingsModal.tsx`, `NotificationsModal.tsx`, `ExportModal.tsx`, `AdminDashboard.tsx`, `AdminExport.tsx`**

### Current Style
Modals use `glass-blur-strong` or `glass-strong` with dark backgrounds.

### New Style
Match terminal group container aesthetic:
- Use `terminal-group` class as base
- Semi-transparent background: `bg-white/[0.08]` instead of dark glass
- Border: `border border-white/10`
- Backdrop blur: `blur(20px)`
- Rounded corners: `rounded-2xl`
- No heavy dark scrim -- lighter feel

### Changes Per Modal
Replace `className="glass-blur-strong rounded-2xl..."` with new terminal-group-inspired styling:
```
className="rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in"
style={{
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}}
```

---

## 8. Admin Tab in Settings for Specific Emails

**File: `src/components/SettingsModal.tsx`**

### Admin Email Check
On mount, check if current user's email is one of:
- fareyxcel@gmail.com
- arrivamv@gmail.com
- arrivalive@gmail.com

### Admin Tab
If admin email detected, add an "Admin" tab (with Shield icon) to the settings tabs array.

### Admin Tab Content
- "Download Blueprint" button that triggers the existing `AdminExport` component logic
- Generates a ZIP file containing:
  - All source files (TSX, TS, CSS, HTML, JS)
  - Image asset URLs
  - Database schema documentation
  - Edge function code
  - Scraping method documentation
  - Component documentation
  - A remix prompt file (`REMIX_PROMPT.md`) with instructions to recreate the app

### Implementation
- Import and reuse the export logic from `AdminExport.tsx`
- Add the ZIP generation inline in the settings modal admin tab
- Include a `REMIX_PROMPT.md` file in the ZIP with a detailed prompt for app recreation

---

## 9. Font List Auto-Scroll to Current Font

**File: `src/components/SettingsModal.tsx`**

### Problem
Users must manually scroll through 200+ fonts to find the currently selected font.

### Solution
- Add a `useEffect` that runs when the Texts tab is active
- Use `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the currently selected font element
- Add a `ref` or `data-font` attribute to each font button
- After render, find the button with matching font name and scroll to it

### Additionally: Font Style Visibility Fix
- The fonts aren't displaying in their actual typeface because they're loaded lazily
- Use an `IntersectionObserver` on the `ScrollArea` to load fonts as they come into view
- For each visible font item, dynamically inject the Google Fonts CSS link
- This ensures fonts display in their actual typeface as users scroll

---

## 10. Automatic Flight Removal (1.5 Hour Cutoff)

**File: `src/pages/Index.tsx`**

### Current Logic (lines 412-432)
Filters flights using a 60-minute cutoff from scheduled time, with special handling for delayed flights.

### Updated Logic
Change cutoff from 60 minutes to 90 minutes (1.5 hours) and apply it to:
- **Landed flights**: Remove if landed time (estimated_time) was more than 1.5 hours ago
- **Cancelled flights**: Remove if cancellation time was more than 1.5 hours ago
- **Delayed flights**: Remove if delayed estimated arrival time was more than 1.5 hours ago
- **Normal flights**: Remove if scheduled time was more than 1.5 hours ago

```typescript
const cutoffTime = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours

// For landed/cancelled, use estimated time as reference
if (flight.status.toUpperCase() === 'LANDED' || flight.status.toUpperCase() === 'CANCELLED') {
  const refTime = flight.estimatedTime || flight.scheduledTime;
  const [h, m] = refTime.split(':').map(Number);
  const refDateTime = new Date(now);
  refDateTime.setHours(h, m, 0, 0);
  return refDateTime >= cutoffTime;
}
```

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/NewHeader.tsx` | Modify | Shorten weather texts, remove menu symbols |
| `src/components/FlightCard.tsx` | Modify | Logo retry, bell centering, status badge redesign |
| `src/components/SettingsModal.tsx` | Major Modify | Admin tab, monochrome controls, new presets, dual glass, font auto-scroll |
| `src/contexts/SettingsContext.tsx` | Modify | New state: monoContrast, monoShadows, monoHighlights, dualGlass settings |
| `src/components/SkyIframeBackground.tsx` | Modify | Enhanced filter chain for monochrome controls |
| `src/components/FlightProgressBar.tsx` | Modify | Show landed/cancelled time labels |
| `src/components/NotificationsModal.tsx` | Modify | Terminal-group modal style |
| `src/components/ExportModal.tsx` | Modify | Terminal-group modal style |
| `src/components/AdminDashboard.tsx` | Modify | Terminal-group modal style |
| `src/components/AdminExport.tsx` | Modify | Terminal-group modal style, add remix prompt |
| `src/pages/Index.tsx` | Modify | 90-minute flight cutoff logic |
| `src/index.css` | Modify | Update modal-overlay styling for lighter feel |

