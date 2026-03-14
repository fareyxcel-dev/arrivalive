

# Fix Airline Logo Mapping, Notifications, and Filter Pill UI

## Issues Found

**1. Logo URLs are wrong** -- The current `getLogoUrls()` builds URLs like `{basePath}EK%20652%20(Emirates).png` (using the full flight ID), but the actual filenames in ImageKit are just `EK (Emirates).png` (IATA code only, no flight number). This is why most logos are missing.

**2. Notifications fail on preview** -- OneSignal throws `Error: Can only be used on: https://arrivalive.lovable.app` because the app ID is locked to the published domain. The subscription flow crashes entirely instead of saving the subscription to the database anyway.

**3. Old subscriptions used UUIDs** -- The 3 existing subscriptions in the database have UUIDs as `flight_id` (e.g., `1aff666a-46e4-4ca1-ac58-ace6ad2871e8`) instead of the text flight ID (e.g., `EK 652`). The current code uses `flight.flightId` (text), so those old entries are orphaned.

**4. Filter pill is in each date divider** -- The user wants it moved to the terminal group header row (right side), visible only when the group is expanded, scoped per-terminal.

---

## Plan

### 1. Fix Logo URL Pattern (`src/lib/cardStyles.ts`)

Rewrite `getLogoUrls()` to use only the 2-character IATA code, not the full flight ID:

```
URL pattern: {basePath}{IATA_CODE}%20({AirlineName}).png
Fallback:    {basePath}Unidentified%20Flight.png
```

For example, flight `EK 652` with airline code `EK` generates:
- Try 1: `{basePath}EK%20(Emirates).png`
- Try 2: `{basePath}Unidentified%20Flight.png`

Also handle the duplicate-name format seen in some files like `JD (Beijing Capital Airlines, Capital Airlines).png` -- add a secondary AIRLINE_NAMES_ALT mapping for those specific cases.

Update `AIRLINE_NAMES` to match exact filenames from ImageKit (verified from fetched directory listings):
- `'VP': 'FlyMe'` (was missing, seen as `VP (FlyMe).png`)
- `'NR': 'MantaAir'` (verify matches `NR (MantaAir).png`)
- etc.

### 2. Add Hourly Retry for Unidentified Logos (`src/components/FlightCard.tsx`)

The `AirlineIcon` component already has a 30-minute retry interval. Change it to 60 minutes (3600000ms) as requested. When all URL attempts fail, show `Unidentified Flight.png` from the same directory (already the last URL in the array). On each hourly tick, reset `urlIndex` to 0 and `imageError` to false to re-attempt matching.

### 3. Fix Notification Subscription Flow (`src/components/FlightCard.tsx`)

Modify `subscribeToFlightNotifications()` to gracefully handle OneSignal failures:
- Wrap OneSignal calls (`subscribeToNotifications`, `setExternalUserId`, `addFlightTag`) in try-catch
- If OneSignal fails (e.g., on preview domain), still proceed with the database upsert
- Save `notify_push: true` and set `onesignal_player_id` only if available
- Show a modified success toast: "Subscribed (push notifications work on published app)"

Modify `handleBellClick()`:
- On unsubscribe: wrap `removeFlightTag` in try-catch (it may also fail on preview)
- Database delete still works fine via Supabase client

### 4. Move Filter Pill to Terminal Header (`src/components/TerminalGroup.tsx`)

- Remove filter pill from date dividers
- Add per-terminal state: `hideCancelled` and `hideLanded` (local `useState`, not from SettingsContext)
- Add a compact filter pill to the terminal header row (right side, before the chevron), visible only when `isExpanded`
- The pill shows a Filter icon; tapping expands it to show "Cancelled" / "Landed" toggle chips
- Badge shows count of hidden flights across all dates in this terminal

### 5. Remove Global Filter from SettingsContext

Since filtering is now per-terminal:
- Keep `hideCancelled`/`hideLanded` in SettingsContext as defaults but the TerminalGroup overrides them locally
- Actually, per user preference: each terminal manages its own filter state independently
- Remove `setHideCancelled`/`setHideLanded` usage from date dividers

---

## Files to Change

| File | Changes |
|------|---------|
| `src/lib/cardStyles.ts` | Fix `getLogoUrls()` to use `{IATA_CODE} ({AirlineName}).png` pattern instead of full flight ID; update AIRLINE_NAMES |
| `src/components/FlightCard.tsx` | Change retry interval to 60min; make notification subscription gracefully handle OneSignal failures |
| `src/components/TerminalGroup.tsx` | Move filter pill from date dividers to terminal header row; use per-terminal local state for hide/show |

