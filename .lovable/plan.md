
# Fix Plan: Progress Bar, Weather Bar, Icons & Global Fonts

## Issues Identified

### 1. Progress Bar Time Text Wrapping to Two Lines
**Problem**: In `FlightCard.tsx` (lines 575-612), the time text container has a fixed width of `w-12` (48px) which is insufficient for 12-hour format with AM/PM like "12:34 PM".

**Current Code (line 576)**:
```tsx
className="font-bold text-[11px] flex-shrink-0 w-12 text-left"
```

**Solution**: Increase width from `w-12` to `w-16` (64px) and add `whitespace-nowrap` to ensure text stays on one line.

### 2. Weather Bar Showing "No rain expected" Instead of Full Forecast
**Problem**: In `WeatherBar.tsx` (lines 256-263), `getChanceOfWeather()` only shows basic rain chance and falls back to "No rain expected" when no rain is predicted. It doesn't utilize the hourly forecast data.

**Current Code**:
```tsx
const getChanceOfWeather = (): string => {
  if (!weather) return '';
  const chanceOfRain = weather.chanceOfRain || 0;
  if (chanceOfRain > 0) {
    return `${chanceOfRain}% chance of rain`;
  }
  return 'No rain expected';
};
```

**Solution**: 
- Enhance the edge function `get-weather` to fetch OpenWeatherMap forecast API (hourly/5-day) for complete upcoming weather data
- Update `getChanceOfWeather()` to show the next upcoming weather change from hourly forecast (e.g., "Rain at 3:00 PM" or "Clear until 6:00 PM")

### 3. Weather Bar Icons on Wrong Side of Text
**Problem**: Currently icons are positioned before text. The user wants them on the opposite side.

**Current Layout (Row 1 - Left Side)**:
```
[☀️ Icon] [12:34 PM]
```

**Target Layout**:
```
[12:34 PM] [☀️ Icon]
```

**Current Layout (Row 1 - Right Side)**:
```
[28°C] [☁️ Icon]
```

**Target Layout**:
```
[☁️ Icon] [28°C]
```

**Solution**: Swap the order of elements in both left and right sections of WeatherBar.tsx

### 4. Global Font Application Not Working Everywhere
**Problem**: The `SettingsContext.tsx` applies font via CSS variables and `document.body.style.fontFamily`, but some elements (especially portals/modals) may not inherit correctly.

**Current Implementation** (SettingsContext.tsx lines 135-152):
- Sets `--font-body` and `--font-display` CSS variables
- Applies to `document.documentElement.style.fontFamily` and `document.body.style.fontFamily`
- Sets `document.documentElement.style.fontSize` for font size

**Solution**:
- Add `!important` to root font-family styles
- Ensure all modal/portal elements use `inherit` or explicit `var(--font-body)`
- Add a global CSS rule that forces font inheritance on all elements

---

## Files to Modify

### 1. `src/components/FlightCard.tsx`
**Lines 575-584, 602-611**:
- Change `w-12` to `w-16` for both scheduled and estimated time spans
- Add `whitespace-nowrap` class

### 2. `src/components/WeatherBar.tsx`
**Lines 256-263** - Update `getChanceOfWeather()`:
- Use `getNextDifferentCondition()` to show more meaningful forecast info
- Show "Rain at X:XX" if rain is coming, or "Clear until X:XX" otherwise

**Lines 311-333** - Left side Row 1 (swap icon and time):
- Move `{formatTime(currentTime)}` before the icon
- Icon should come after the time text

**Lines 375-393** - Right side Row 1 (swap icon and temperature):
- Move the weather icon before the temperature
- Temperature should come after the icon

### 3. `supabase/functions/get-weather/index.ts`
**Add OpenWeatherMap Forecast API call**:
- After getting current weather, fetch 5-day/3-hour forecast
- Parse hourly forecast data
- Include in response as `hourlyForecast` array

### 4. `src/index.css`
**Lines 75-93** - Add global font inheritance:
```css
*, *::before, *::after {
  font-family: inherit !important;
}

[data-radix-portal], [data-radix-popper-content-wrapper] {
  font-family: var(--font-body) !important;
}
```

### 5. `src/contexts/SettingsContext.tsx`
**Lines 135-152** - Enhance font application:
- Add inline style injection for portals
- Use `!important` in CSS variable setting

---

## Detailed Changes

### Change 1: FlightCard Time Width (FlightCard.tsx)

**Line 576** - Scheduled time:
```tsx
// FROM:
className="font-bold text-[11px] flex-shrink-0 w-12 text-left"
// TO:
className="font-bold text-[11px] flex-shrink-0 w-16 text-left whitespace-nowrap"
```

**Line 603** - Estimated time:
```tsx
// FROM:
className="font-bold text-[11px] flex-shrink-0 w-12 text-right"
// TO:
className="font-bold text-[11px] flex-shrink-0 w-16 text-right whitespace-nowrap"
```

### Change 2: Weather Bar Forecast Text (WeatherBar.tsx)

**Replace `getChanceOfWeather` function (lines 256-263)**:
```tsx
const getChanceOfWeather = (): string => {
  if (!weather) return '';
  
  // Check if there's an upcoming weather change
  const nextCondition = getNextDifferentCondition();
  
  if (nextCondition) {
    const nextNormalized = normalizeCondition(nextCondition.nextCondition);
    if (nextNormalized === 'rain' || nextNormalized === 'storm') {
      return `Rain at ${nextCondition.forecastTime}`;
    }
    return `${nextCondition.nextCondition} at ${nextCondition.forecastTime}`;
  }
  
  // Fallback to rain chance
  const chanceOfRain = weather.chanceOfRain || 0;
  if (chanceOfRain > 0) {
    return `${chanceOfRain}% chance of rain`;
  }
  
  // Show stable weather message
  return `${weather.condition} all day`;
};
```

### Change 3: Weather Bar Icon Positions (WeatherBar.tsx)

**Left side Row 1 (lines 311-333)** - Move icon after time:
```tsx
<button 
  onClick={toggleTimeFormat}
  className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
>
  {/* Time first */}
  <p className="text-xl font-bold text-white">
    {formatTime(currentTime)}
  </p>
  {/* Icon after */}
  <div className={cn(
    "transition-all duration-300",
    showSunCountdown && "opacity-0"
  )}>
    {isDay ? (
      <Sun className="w-5 h-5 text-white animate-pulse-soft" />
    ) : (
      <Moon className="w-5 h-5 text-white animate-pulse-soft" />
    )}
  </div>
  {showSunCountdown && (
    <div className="absolute animate-fade-in text-white">
      {sunData.icon}
    </div>
  )}
</button>
```

**Right side Row 1 (lines 375-393)** - Move icon before temperature:
```tsx
<button
  onClick={toggleTemperatureUnit}
  className="flex items-center justify-end gap-2 ml-auto hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
>
  {/* Icon first */}
  <div className={cn(
    "text-white transition-all duration-300",
    showForecast && "opacity-0"
  )}>
    {getWeatherIcon(weather.condition, isDay)}
  </div>
  {showForecast && nextCondition && (
    <div className="absolute animate-fade-in text-white" style={{ left: '1rem' }}>
      {getWeatherIcon(nextCondition.nextCondition, isDay)}
    </div>
  )}
  {/* Temperature after */}
  <p className="text-xl font-bold text-white">
    {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
  </p>
</button>
```

### Change 4: Enhanced Weather Edge Function (get-weather/index.ts)

Add forecast API call after current weather:
```typescript
// After getting current weather, get forecast
if (openWeatherKey && weatherData) {
  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric&cnt=16`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();
    
    if (forecastData.list) {
      weatherData.hourlyForecast = forecastData.list.map((item: any) => ({
        time: item.dt_txt,
        condition: item.weather?.[0]?.main || "Clear",
        temp: Math.round(item.main.temp),
        chanceOfRain: Math.round((item.pop || 0) * 100),
      }));
      
      // Calculate overall chance of rain (max in next 6 hours)
      const next6Hours = weatherData.hourlyForecast.slice(0, 2);
      weatherData.chanceOfRain = Math.max(...next6Hours.map((h: any) => h.chanceOfRain));
    }
  } catch (e) {
    console.error("Forecast fetch error:", e);
  }
}
```

### Change 5: Global Font CSS (index.css)

Add after line 93:
```css
/* Global font inheritance for all elements including portals */
*, *::before, *::after {
  font-family: inherit;
}

/* Force font on Radix UI portals (dialogs, popovers, etc.) */
[data-radix-portal],
[data-radix-popper-content-wrapper],
[role="dialog"],
[role="menu"],
.modal-overlay,
.modal-overlay * {
  font-family: var(--font-body) !important;
}
```

### Change 6: Settings Context Font Application (SettingsContext.tsx)

Enhance the useEffect that applies fonts (around line 135):
```tsx
useEffect(() => {
  localStorage.setItem('arriva-settings', JSON.stringify(settings));
  
  const fontFamily = `'${settings.fontFamily}', sans-serif`;
  
  // Set CSS custom properties
  document.documentElement.style.setProperty('--font-body', fontFamily);
  document.documentElement.style.setProperty('--font-display', fontFamily);
  
  // Apply to root elements for global coverage
  document.documentElement.style.fontFamily = fontFamily;
  document.body.style.fontFamily = fontFamily;
  
  // Inject style for portals (they may not inherit from body)
  let portalStyle = document.getElementById('portal-font-style');
  if (!portalStyle) {
    portalStyle = document.createElement('style');
    portalStyle.id = 'portal-font-style';
    document.head.appendChild(portalStyle);
  }
  portalStyle.textContent = `
    [data-radix-portal], [data-radix-portal] *, 
    [role="dialog"], [role="dialog"] *,
    [role="menu"], [role="menu"] *,
    .modal-overlay, .modal-overlay * {
      font-family: ${fontFamily} !important;
    }
  `;
  
  // Apply font size
  document.documentElement.style.fontSize = `${settings.fontSize}px`;
  
  // Apply text case
  let textTransform: string;
  switch (settings.textCase) {
    case 'uppercase':
      textTransform = 'uppercase';
      break;
    case 'lowercase':
      textTransform = 'lowercase';
      break;
    default:
      textTransform = 'none';
  }
  document.documentElement.style.setProperty('--text-case', textTransform);
  
  // Load Google Font dynamically
  const fontLink = document.getElementById('dynamic-font') as HTMLLinkElement;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
  
  if (fontLink) {
    fontLink.href = fontUrl;
  } else {
    const link = document.createElement('link');
    link.id = 'dynamic-font';
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }
}, [settings]);
```

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| FlightCard.tsx | Increase time container width from w-12 to w-16, add whitespace-nowrap | Prevents AM/PM wrapping |
| WeatherBar.tsx | Update getChanceOfWeather() to show forecast changes | More informative weather info |
| WeatherBar.tsx | Swap icon/text order on both sides | Icons on opposite side of text |
| get-weather/index.ts | Add forecast API call for hourly data | Enables full forecast display |
| index.css | Add global font inheritance rules | Ensures fonts apply everywhere |
| SettingsContext.tsx | Inject dynamic style for portals | Fonts apply to modals/dialogs |

