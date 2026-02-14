
# Header Fix, Font Visibility, Notification System Repair, Glass UI Enhancement, Loading Animations

## Overview
This plan addresses 7 key areas: header weather text alignment, font preview visibility in settings, notification bell subscription flow repair, flight card text color matching, gradient blur UI enhancement, loading/splash animations using uploaded GIFs, and a splash screen with glass blur reveal.

---

## 1. Header Weather Text Alignment Fix

**File: `src/components/NewHeader.tsx`**

### Problem
The weather text on the right side (both default and alternative) is mispositioned -- it overlaps with the center logo area (visible in reference image 1).

### Root Cause
The right column container uses `space-y-0` and text flows without proper right-alignment constraints. The weather condition text and duration text are not properly anchored to the right edge.

### Fix
- Wrap the entire right column in `justify-self-end` to push content to the far right
- Add `text-right` to all child elements explicitly
- Change the left column's day/date toggle from using absolute positioning (which causes displacement) to a single conditional render block -- same fix as weather
- For the left column sun countdown: replace the `blur-sm opacity-0` + absolute overlay with a simple ternary (show either day/date OR sun countdown, never both)
- For the right column: already fixed in the latest code using ternary, but ensure `justify-self-end` is on the outer container

### Specific Changes
Left column (lines 307-342): Replace the two overlapping buttons with one conditionally rendered block:
```tsx
<button onClick={handleDayDateClick} className="block text-left ...">
  <p>{showSunCountdown ? `${sunData.label} in ${sunData.countdown}` : formatDay(currentTime)}</p>
  <p>{showSunCountdown ? `at ${sunData.time}` : formatDate(currentTime)}</p>
</button>
```

Right column (lines 420-456): Add `justify-self-end` to the outer div to anchor right.

---

## 2. Font Style Visibility in Settings

**File: `src/components/SettingsModal.tsx`**

### Problem
Font names in the picker all render in the same default font instead of previewing in their actual typeface (reference image 2 shows how they should look).

### Root Cause
The `IntersectionObserver` is set up via `setupFontObserver` callback, but the `ScrollArea` component wraps content in its own viewport div. The observer's `root` is set to the `fontScrollRef` node, but the actual scrolling container is the ScrollArea's viewport child. This means elements never "intersect" because the observer root doesn't match the scroll container.

### Fix
1. Remove the `ref={fontScrollRef}` from the inner div and instead use `useEffect` to find the ScrollArea's viewport element (which has `data-radix-scroll-area-viewport`)
2. Set the observer's `root` to the actual viewport element
3. Always apply `fontFamily` inline style regardless of whether the font has loaded -- the browser will show fallback until the font CSS loads
4. When an element intersects, inject the Google Fonts `<link>` tag to load that font
5. Add a small delay (200ms) after tab switch before setting up the observer to ensure DOM is ready

### Code Change
```tsx
useEffect(() => {
  if (activeTab !== 'texts' || !isOpen) return;
  const timer = setTimeout(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    // ... set up IntersectionObserver with root: viewport
  }, 200);
  return () => clearTimeout(timer);
}, [activeTab, isOpen]);
```

Each font button always gets `style={{ fontFamily: "'FontName', sans-serif" }}`.

---

## 3. Notification Bell Subscription Flow Repair

**Files: `src/components/FlightCard.tsx`, `src/pages/Index.tsx`, `src/components/TerminalGroup.tsx`**

### Problem
There are TWO competing subscription paths causing confusion:
1. `FlightCard.handleBellClick()` calls `subscribeToFlightNotifications()` which uses `flight.flightId` (text like "EK 652") and inserts into `notification_subscriptions`
2. `Index.handleToggleNotification()` also inserts into `notification_subscriptions` using `flightId` parameter (which is `flight.id` -- a UUID)

Additionally, `loadUserSubscriptions` loads `flight_id` from subscriptions and checks `notificationIds.has(flight.id)`, but the stored `flight_id` could be either UUID or text depending on which path ran.

### Fix -- Unify on a single subscription path
- **Remove** the duplicate insertion logic from `Index.handleToggleNotification`. Instead, make it only update local state (`notificationIds` and `notificationCount`)
- **Keep** `FlightCard.handleBellClick` as the sole subscription manager (it handles OneSignal, database insert/delete, and toast)
- **Standardize** on using `flight.flightId` (text like "EK 652") as the key in `notification_subscriptions.flight_id`
- **Update** `loadUserSubscriptions` to build the Set using `flight_id` (text), and `TerminalGroup` to check `notificationIds.has(flight.flightId)` instead of `flight.id`
- **Update** `FlightCard.handleBellClick` to call `onToggleNotification(flight.flightId)` so the parent state stays in sync
- **Update** `loadUserSubscriptions` to NOT filter by `flight_date = today` (subscriptions for future dates should also show)

### Notification Modal Fix
- In `NotificationsModal`, when loading subscriptions, also join with flights to get `origin`, `scheduled_time`, `estimated_time`, and `status`
- Display these real details instead of just flight_id text

---

## 4. Flight Card Text Color Matching Airline Logo

**File: `src/components/FlightCard.tsx`**

### Current State
Flight card text colors are based on status theme (`theme.textColor`). The airline logos are color-filtered to match. This is already working as designed -- the text and logo share the same color via `getColorFilter`.

### Enhancement
Ensure ALL text within the card (flight ID, origin, time, status badge, SCH/EST labels) uses the same `theme.textColor`. This is already the case in the current code. No changes needed here beyond verification.

---

## 5. Gradient Live Blur for UI Elements

**File: `src/index.css`**

### Enhancement
Add gradient blur with 3-level brightness tiers for glass elements:
- Top area: `brightness(1.99)` (near +0.99 above base)
- Middle area: `brightness(1.66)` 
- Bottom area: `brightness(1.33)`

### New CSS Classes
```css
.glass-gradient-blur {
  position: relative;
}
.glass-gradient-blur::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    to bottom,
    rgba(255,255,255,0.12) 0%,
    rgba(255,255,255,0.06) 50%,
    rgba(255,255,255,0.02) 100%
  );
  pointer-events: none;
  z-index: 0;
}
```

### Apply to:
- Toggles (LiveBlurToggle)
- Sliders (track and range)
- Buttons (glass-interactive)
- Text inputs
- Menu pill
- All interactive UI elements

---

## 6. Loading Animation & Splash Screen

**Files: `src/components/LoadingSpinner.tsx`, `src/pages/Index.tsx`, new `src/components/SplashScreen.tsx`**

### Loading Spinner
- Copy uploaded GIF #1 (palm tree icon) to `src/assets/loading.gif` (replace existing)
- `LoadingSpinner` already uses this file -- just needs the new asset

### Splash Screen
- Copy uploaded GIF #2 (full Arriva.MV logo animation) to `src/assets/splash-logo.gif`
- Create `SplashScreen.tsx`: full-screen component showing the splash GIF centered on a heavily blurred glass background
- The glass background uses `backdrop-filter: blur(40px)` over the iframe
- Once iframe is loaded AND flight data is fetched, animate the blur away (reduce from 40px to 0 over 1.5s) to reveal the home screen
- Show splash for minimum 2 seconds, then fade out when data is ready

### Implementation in Index.tsx
- Add `iframeLoaded` state (set via callback from `SkyIframeBackground`)
- Add `showSplash` state (default true)
- When `!isLoading && iframeLoaded`, start fade-out animation, then set `showSplash = false`
- Render `SplashScreen` overlay when `showSplash` is true

---

## 7. SkyIframeBackground Load Callback

**File: `src/components/SkyIframeBackground.tsx`**

- Add `onLoad?: () => void` prop
- Attach `onLoad` handler to the iframe element
- Parent (Index.tsx) passes callback to set `iframeLoaded = true`

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/NewHeader.tsx` | Fix weather text alignment, replace absolute positioning with conditional rendering |
| `src/components/SettingsModal.tsx` | Fix IntersectionObserver root for font preview, find ScrollArea viewport |
| `src/components/FlightCard.tsx` | Remove competing subscription logic, standardize on flightId text key |
| `src/pages/Index.tsx` | Simplify handleToggleNotification, fix loadUserSubscriptions, add splash state |
| `src/components/TerminalGroup.tsx` | Check `notificationIds.has(flight.flightId)` instead of `flight.id` |
| `src/components/NotificationsModal.tsx` | Show real flight details (origin, times, status) |
| `src/components/LoadingSpinner.tsx` | Already uses loading.gif -- just need to replace the asset file |
| `src/components/SplashScreen.tsx` | **New** -- splash overlay with glass blur reveal animation |
| `src/components/SkyIframeBackground.tsx` | Add onLoad callback prop |
| `src/index.css` | Add glass-gradient-blur class for 3-tier brightness gradient |
| Asset copies | Copy uploaded GIFs to src/assets/loading.gif and src/assets/splash-logo.gif |
