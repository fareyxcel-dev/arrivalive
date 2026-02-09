

# Comprehensive Glass UI, Flight Card, and Settings Overhaul

## Overview
This plan addresses glass UI refinement matching the uploaded reference images, flight card layout fixes, notification bell functionality, flight tracker improvements, settings slider overhaul, error reporting, haptic feedback, adaptive drop shadows, and the 1-hour flight removal cutoff.

---

## 1. Glass UI Overhaul (Matching Reference Images)

**Files: `src/index.css`, `src/components/FlightCard.tsx`, `src/components/TerminalGroup.tsx`, `src/components/SettingsModal.tsx`**

The reference images show a neumorphic/glass aesthetic with:
- Inset shadows creating depth (concave surfaces)
- Outer glow borders (subtle white glow around containers)
- Frosted glass with inner shadow effects
- Status-colored outer glow for badges (gold for DELAYED, green for LANDED)

### New CSS Classes
- `.glass-neumorphic` - Base neumorphic glass with inset shadows and outer glow
- `.glass-pill` - Rounded pill with neumorphic concave surface (for progress bars, sliders, status badges)
- `.glass-orb` - Circular neumorphic button (for bell icons, toggles)
- Status pills get colored outer glow: `box-shadow: 0 0 15px rgba(statusColor, 0.3), inset 0 2px 4px rgba(255,255,255,0.1)`

### Apply Consistently To
- Toast notifications (Sonner)
- All modal containers
- Flight cards and their contents (keeping status coloring)
- Terminal groups
- Settings sliders and toggles
- Header menu pill

---

## 2. Flight Card Status Badge as Multi-Layered Pill

**File: `src/components/FlightCard.tsx`**

Based on reference images, the right-side pill container will have these states:

### Collapsed Card States
- **No status**: `[ EST 02:42 PM | Bell ]` - time + bell in glass pill
- **Delayed**: `[ 02:42 PM | DELAYED | Bell ]` - time, status badge (gold glow), bell
- **Landed**: `[ LANDED 9:07 AM ]` - no bell (landed/cancelled remove bell)
- **Cancelled**: `[ CANCELLED 3:15 PM ]` - no bell

### Expanded Card States
- **No status**: `[ Bell ]` - time fades out, bell remains as an orb
- **Delayed**: `[ DELAYED | Bell ]` - time fades out, status + bell remain
- **Landed**: Status badge hidden, shows expanded tracker row
- **Cancelled**: Status badge hidden, shows expanded tracker row

### Key Changes
- Do NOT abbreviate texts -- show full "DELAYED", "LANDED", "CANCELLED"
- Pill width transitions smoothly using `transition: width 0.5s`
- Bell icon stays visible when card expands (unless landed/cancelled)
- Bell silhouette glows when active (notification subscribed): apply `filter: drop-shadow(0 0 8px currentColor)` and brighter opacity

---

## 3. Extended Flight Card Bottom Row

**File: `src/components/FlightCard.tsx`, `src/components/FlightProgressBar.tsx`**

### Equal Height for All Cards When Expanded
- All cards get the same extended row height regardless of status
- Single row layout: `SCH {time} | [Flight Tracker with countdown] | EST {time}`
- For landed: `SCH {time} | [Tracker showing "LND {time}" center text] | LND {time}`
- For cancelled: `SCH {time} | [Empty bar with "Cancelled" center text] | CNL {time}`
- Do NOT abbreviate -- show "SCH", "EST", "LND" labels clearly

### Countdown Inside Tracker Bar
- Small font countdown centered inside the progress bar track
- Text: "{Xh Ym}" or "{Xm}" remaining
- Positioned with `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;`

---

## 4. Flight Tracker Aircraft Icon

**File: `src/components/FlightProgressBar.tsx`**

### Replace Image Icon with Glass Unicode Glyph
- Use the `✈` character styled as a glass element instead of the external image
- Apply neumorphic glass styling: text-shadow, drop-shadow matching status color
- Remove the external image URL dependency
- Icon moves along the progress bar accurately based on `planePosition`
- Remove flight icon animations from terminal groups (no plane animations on group headers)

---

## 5. Notification Bell Fixes

**Files: `src/components/FlightCard.tsx`, `src/lib/onesignal.ts`, `src/components/NotificationsModal.tsx`**

### Bell Behavior
- Bell stays visible when card expands (only hidden for landed/cancelled)
- One-click subscribe/unsubscribe with toast showing actual flight details
- Bell glows when active: `filter: drop-shadow(0 0 8px color); opacity: 1`
- Bell dim when inactive: `opacity: 0.5`

### Notification Content Fix
- Toast messages currently show flight ID correctly
- NotificationsModal needs to show actual flight_id and origin from database, not random IDs
- Query notification_subscriptions joined with flights table to get full flight details

### Push Notification Flow
1. Click bell on flight card
2. Request OneSignal permission if not granted
3. Save subscription to database with correct flight_id and flight_date
4. OneSignal tags the user with flight identifier
5. When status changes, edge function sends push with real flight data

### Haptic Feedback
- Add `navigator.vibrate(50)` on bell toggle for mobile devices
- Wrapped in try-catch for browser compatibility

---

## 6. Settings Style Tab Overhaul

**File: `src/components/SettingsModal.tsx`, `src/contexts/SettingsContext.tsx`**

### Replace Monochrome Toggle with Mini Sliders
Remove the single monochrome toggle. Instead show these sliders always:
- **Brightness** (0-200%, default 100%)
- **Contrast** (50-150%, default 100%)
- **Saturation** (0-200%, default 100%) -- replaces monochrome logic
- **Shadows** (0-100, default 50)
- **Highlights** (0-100, default 50)
- **Hue Shift** (0-360deg, default 0)

### Compact Layout
- On wider screens (>360px), show 2 sliders per row using CSS grid
- Each slider has a compact label with value display
- Remove the monochrome-specific conditional rendering

### Settings State Updates
Add `hueShift: number` (0-360, default 0) to SettingsState.
Rename saturation logic: saturation slider directly controls CSS filter `saturate()`.
Remove `monochrome` boolean -- saturation at 0% = grayscale, 100% = normal, 200% = oversaturated.

### Reset to Default Button
- Add a small reset icon (RotateCcw) next to each slider label
- Clicking resets that specific setting to its default value
- Compact: icon-only button, 16x16px

---

## 7. Updated Glass Presets

**File: `src/contexts/SettingsContext.tsx`, `src/components/SettingsModal.tsx`**

Replace current presets with more visually distinct ones. Each preset will store blur, opacity, and additional properties (border style, shadow style, tint color):

| Preset | Blur | Opacity | Special |
|--------|------|---------|---------|
| Frosted | 20px | 0.08 | Standard white frost |
| Liquid | 35px | 0.05 | High blur, low opacity, fluid feel |
| Prismatic | 12px | 0.06 | Rainbow border gradient |
| Stained | 18px | 0.15 | Warm amber tint |
| Polarized | 25px | 0.10 | High contrast, sharp edges |
| iOS | 25px | 0.08 | Vibrancy + saturation boost |
| Aero | 14px | 0.20 | Classic Windows transparency |
| Vista | 8px | 0.25 | Thick glass, low blur |
| Windows | 18px | 0.12 | Acrylic noise texture |
| Linux | 4px | 0.04 | Near-transparent minimal |
| Mac | 22px | 0.07 | Warm vibrancy |
| Ubuntu | 10px | 0.18 | Orange-tinted desktop |

### Dual Glass
- Keep existing dual glass toggle
- When enabled, averages blur and opacity from two selected presets

---

## 8. Adaptive Drop Shadows for All Text/Icons

**File: `src/index.css`, various components**

### Implementation
Add a global CSS class or CSS variable that applies `text-shadow` and `filter: drop-shadow()` to:
- All text elements
- Icons and logos  
- Glyphs and illustrations

### Shadow Style
```css
text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
```

For icons:
```css
filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
```

### Adaptive to iframe
The shadow adapts based on the iframe brightness setting:
- Darker iframe = lighter shadows (reduce shadow opacity)
- Brighter iframe = darker shadows (increase shadow opacity)
- Controlled via CSS variable `--shadow-opacity` computed from `iframeBrightness`

---

## 9. Header Weather Text Verification

**File: `src/components/NewHeader.tsx`**

### Fix Weather Alignment (Red Circle in 4th Image)
- The weather text on the right side can overflow into the center logo area
- Add `max-width` constraint: `max-w-[35vw]` on both left and right columns
- Ensure `overflow: hidden` and `text-overflow: ellipsis` for safety
- Reduce font sizes further if needed on very narrow screens

### Verify Weather Match
- The header weather text comes from the `get-weather` edge function
- The iframe uses its own weather logic in `live-skyview.html`
- These should match since they both compute from the same data source
- If mismatch detected, the error report feature (see below) lets users flag it

---

## 10. Error Report Tab in Settings

**File: `src/components/SettingsModal.tsx`**

### New "Report" Tab
Add a tab with Bug icon between Security and Admin:

**Report Tab Contents:**
- Report type selector: "Bug", "Weather Issue", "Feature Request"
- If "Weather Issue" selected:
  - Toggle: "Weather text is incorrect"
  - If toggled on, show text inputs to correct the current condition and temperature
  - "Submit correction" button stores the correction to the `admin_reports` table with `report_type: 'weather_correction'`
  - Include the user's corrected values as JSON in the description field
- Title input field
- Description textarea
- Submit button

### Database
Uses existing `admin_reports` table (already has report_type, title, description columns).

---

## 11. Flight Removal Cutoff: 1 Hour

**File: `src/pages/Index.tsx`**

### Change
Update the flight filter cutoff from 90 minutes to 60 minutes (1 hour):
```typescript
const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
```

This applies to all statuses: landed, cancelled, delayed, and scheduled flights.

---

## 12. Smooth Status Change Animations

**File: `src/components/FlightCard.tsx`, `src/index.css`**

### Implementation
When a flight status changes (via realtime update):
- Card background color transitions smoothly over 1 second
- Status badge fades in with scale animation
- Use CSS `transition: background 1s ease, border-color 1s ease` on card container

### Auto-Collapse on Scroll
Already implemented. Verify it triggers on parent scroll container, not just window scroll.

---

## 13. Slider and Toggle Visual Overhaul

**File: `src/components/SettingsModal.tsx`**

### LiveBlurToggle Updates
- Remove any solid/black colors from toggle tracks
- Track uses `backdrop-filter: blur() brightness()` with varying brightness:
  - OFF: brightness 0.7 (darker glass)
  - ON: brightness 1.3 (brighter glass)
- Thumb uses frosted glass with white semi-transparent background

### Slider Styling
- Override Radix slider styles in `src/index.css`:
  - Track: glass background with inset shadow
  - Range (filled part): brighter glass with `backdrop-filter: brightness(1.4)`
  - Thumb: neumorphic glass circle with drop shadow

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/FlightCard.tsx` | Major | Glass pill container, bell fixes, haptic feedback, status animations |
| `src/components/FlightProgressBar.tsx` | Modify | Unicode plane icon, glass styling, remove image dependency |
| `src/components/NewHeader.tsx` | Modify | Weather alignment fix, max-width constraints |
| `src/components/SettingsModal.tsx` | Major | Mini sliders grid, reset buttons, error report tab, glass slider styling |
| `src/contexts/SettingsContext.tsx` | Modify | Add hueShift, remove monochrome boolean, update filter computation |
| `src/components/SkyIframeBackground.tsx` | Modify | Apply hue-rotate filter, compute adaptive shadow opacity |
| `src/components/TerminalGroup.tsx` | Modify | Remove plane animations, glass styling |
| `src/components/NotificationsModal.tsx` | Modify | Show real flight details |
| `src/pages/Index.tsx` | Modify | 1-hour cutoff |
| `src/index.css` | Major | Neumorphic glass classes, slider overrides, adaptive shadows, status animations |

