
# Comprehensive UI Enhancement Plan

## Overview
This plan addresses multiple UI/UX improvements including header text sizing, settings restructuring with new tabs, enhanced font picker, glass UI presets, collapsible flight cards, notification flow, and date pill styling.

---

## 1. Header Text Size Reduction

### Current Issue
Header texts (time, date, weather info) may wrap to second lines on smaller screens due to font sizes.

### Solution
**File: `src/components/NewHeader.tsx`**
- Reduce base font sizes:
  - Time: `text-xl` → `text-lg`, scrolled: `text-lg` → `text-base`
  - Day/weather duration: `text-sm` → `text-xs`, scrolled: `text-xs` → `text-[10px]`
  - Date/upcoming weather: `text-xs` → `text-[10px]`, scrolled: `text-[10px]` → `text-[9px]`
- Add `whitespace-nowrap` to all text elements to prevent wrapping
- Adjust chevron menu pill styling

---

## 2. Date Pill Text Extension in Terminal Groups

### Current Issue
Status abbreviations use single letters: `{dateLandedCount}L · {dateCancelledCount}C · {remainingCount}R`

### Solution
**File: `src/components/TerminalGroup.tsx`**
- Replace abbreviations with full words:
  ```
  "{totalCount} flights" → Row 1
  "{dateLandedCount} Landed · {dateCancelledCount} Cancelled · {remainingCount} Remaining" → Row 2
  ```
- Reduce overall height by using `py-1.5` instead of `py-2`
- Reduce border-radius from `rounded-lg` to `rounded-md`
- Fix dark grey selection issue by using proper active state styling

---

## 3. Settings Modal Restructuring with New Tabs

### Current Structure
Tabs: Profile, Appearance, Notifications, Security

### New Structure
Tabs: **Profile, Texts, Style, Notifications, Security**

**File: `src/components/SettingsModal.tsx`**

#### A. New "Style" Tab (moved from Appearance)
Contains visual/display settings:
- **Iframe Brightness Slider** (0-200%, default 100%)
- **Glass Blur Slider** (0-40px, default 20px)
- **Glass Opacity Slider** (0-50%, default 10%)
- **Monochrome Toggle with Intensity Slider** (0-100%)
- **10 Glass UI Presets** (selectable cards):
  1. Crystal Clear - minimal blur, high transparency
  2. Frosted Glass - medium blur, low opacity
  3. Dark Smoke - high blur, dark tint
  4. Ocean Mist - blue-tinted glass
  5. Sunset Glow - warm orange tint
  6. Midnight - very dark, subtle blur
  7. Arctic - bright, icy appearance
  8. Cyberpunk - neon-accented glass
  9. Minimal - almost no blur, clean
  10. Classic - balanced defaults

#### B. New "Texts" Tab (renamed from Appearance)
Contains text-related settings:
- **Bold Toggle** (on/off)
- **Extended Font Selection Area** - scrollable grid/list of all fonts with live previews
- **Font Size Slider** (12-24px)
- **Text Case Toggle** (Default/Uppercase/Lowercase)
- **Color Shift Slider** (-100 to 100) - adjusts text brightness/darkness

#### C. Dynamic Settings Title
- When switching tabs, title shows tab name (e.g., "Style Settings") for 11 seconds
- Then morphs back to "Settings"
- State managed with `useState` and `setTimeout`

---

## 4. Enhanced Font Picker with Scrollable Grid

### Solution
**File: `src/components/FontPicker.tsx`**

New features:
- Remove dropdown behavior for main settings area
- Create scrollable grid layout showing all 80+ fonts
- Each font displayed in its own typeface as preview
- Lazy-load fonts as they scroll into view (IntersectionObserver)
- Bold text toggle affects previews

**File: `src/hooks/usePreloadedFonts.ts`** (NEW)
- Hook that preloads all fonts on app initialization
- Uses document.fonts.load() for faster previews
- Returns loading state and loaded fonts set

---

## 5. Settings Context Updates

**File: `src/contexts/SettingsContext.tsx`**

New settings state properties:
```typescript
interface SettingsState {
  // Existing
  fontFamily: string;
  fontSize: number;
  textCase: 'default' | 'uppercase' | 'lowercase';
  timeFormat: '12h' | '24h';
  temperatureUnit: 'C' | 'F';
  blurLevel: number;
  glassOpacity: number;
  notifications: {...};
  
  // New
  iframeBrightness: number;      // 0-200, default 100
  monochrome: boolean;           // default false
  monochromeIntensity: number;   // 0-100, default 50
  glassPreset: string;           // preset name or 'custom'
  boldText: boolean;             // default false
  colorShift: number;            // -100 to 100, default 0
}
```

New setter functions:
- `setIframeBrightness(value)`
- `setMonochrome(enabled)`
- `setMonochromeIntensity(value)`
- `setGlassPreset(preset)`
- `setBoldText(enabled)`
- `setColorShift(value)`

CSS Variable injection updates:
- `--iframe-brightness: {value}%`
- `--iframe-monochrome: {enabled ? monochromeIntensity : 0}%`
- `--font-weight: {boldText ? 700 : 400}`
- `--color-shift: {value}`

---

## 6. Collapsible Flight Cards

### Current Behavior
Flight cards always show full 4-row layout including progress bar.

### New Behavior
**File: `src/components/FlightCard.tsx`**

#### Collapsed State (Default)
- Rows 1-2 only: Airline logo, Flight ID, Origin, Status/Bell
- Compact estimated time shown before status badge:
  - **Normal**: Time before bell icon
  - **Delayed**: Time before DELAYED badge
  - **Landed**: Landed time before LANDED badge
  - **Cancelled**: Cancelled time before CANCELLED badge
- Time opacity: 80% (20% reduced transparency)
- Click on time or flight ID/origin expands card

#### Expanded State
- Full 4-row layout with progress bar
- Time text fades out when expanded
- Click anywhere except bell to collapse

Implementation:
```typescript
const [isExpanded, setIsExpanded] = useState(false);

const handleCardClick = (e: React.MouseEvent) => {
  if ((e.target as HTMLElement).closest('.bell-button')) return;
  setIsExpanded(!isExpanded);
};
```

Card height reduction:
- Collapsed: ~60-70px
- Expanded: ~110-125px (current)

---

## 7. Menu Chevron → Pill Transformation

### Current Behavior
- `˅` character under logo, expands to vertical dropdown

### New Behavior
**File: `src/components/NewHeader.tsx`**

#### Default State
- Small pill container (like flight cards) containing `˅`
- Semi-translucent white background
- Width: ~40px, Height: ~24px

#### Expanded State
- Pill grows horizontally to ~320px
- Menu items display in horizontal row (icons only or icons + short labels)
- Chevron flips to `˄`
- Smooth animation using CSS transform + width transition

```tsx
<button 
  onClick={() => setIsMenuOpen(!isMenuOpen)}
  className={cn(
    "glass rounded-full transition-all duration-300 flex items-center justify-center",
    isMenuOpen 
      ? "w-80 h-10 gap-4 px-4" 
      : "w-10 h-6 px-2"
  )}
>
  {isMenuOpen ? (
    <>
      {menuItems.map(item => (
        <button key={item.label} onClick={item.action}>
          <item.icon className="w-5 h-5" />
        </button>
      ))}
      <span>˄</span>
    </>
  ) : (
    <span className="text-lg text-white/60">˅</span>
  )}
</button>
```

---

## 8. Terminal Group Transparency Adjustments

### Current Issue
When date pill is clicked, it turns "grey dark and looks weird"

### Solution
**File: `src/components/TerminalGroup.tsx`**

- Unextended group containers: `bg-white/[0.02]` (very transparent, blends with background)
- Extended group containers: `bg-white/[0.08]` (normal visibility)
- Date pill active state: Use `active-selection` class with proper opacity
- Remove harsh dark backgrounds, use soft glass effect instead

```tsx
// Date pill styling fix
className={cn(
  "w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all",
  isDateExpanded 
    ? "bg-white/15 border border-white/20" // Soft active state
    : "bg-white/[0.03] hover:bg-white/[0.06]" // Subtle default
)}
```

---

## 9. Notification Bell One-Click Subscribe

### Current Flow
Bell click → Modal opens → User selects options

### New Flow
**File: `src/components/FlightCard.tsx`**

Single-click behavior:
1. Click bell icon
2. If not subscribed:
   - Request OneSignal permission (if needed)
   - Create subscription in database
   - Show toast: "Notifications enabled for {flightId}"
3. If subscribed:
   - Delete subscription from database
   - Show toast: "Notifications disabled for {flightId}"

Push/WebPush/Email all enabled by default on subscribe.

---

## 10. Glass UI Applied to Modals and Toasts

### Solution

**File: `src/index.css`**
Add glass styles for toast notifications:
```css
.sonner-toast {
  backdrop-filter: blur(20px) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}
```

**All Modal Files**
Ensure `glass-blur-strong` class is applied to modal containers.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/NewHeader.tsx` | Modify | Reduce text sizes, pill menu transformation |
| `src/components/TerminalGroup.tsx` | Modify | Extended date pill text, transparency fixes |
| `src/components/SettingsModal.tsx` | Major Modify | Split into Texts/Style tabs, add all new controls |
| `src/contexts/SettingsContext.tsx` | Modify | Add new settings properties and setters |
| `src/components/FlightCard.tsx` | Major Modify | Collapsible behavior, compact time display |
| `src/components/FontPicker.tsx` | Modify | Scrollable grid layout with previews |
| `src/hooks/usePreloadedFonts.ts` | Create | Font preloading hook |
| `src/index.css` | Modify | Toast glass styles, new CSS variables |
| `src/components/SkyIframeBackground.tsx` | Modify | Apply brightness/monochrome filters |

---

## Technical Notes

### Font Preloading Strategy
```typescript
// usePreloadedFonts.ts
const usePreloadedFonts = (fonts: string[]) => {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    fonts.forEach(font => {
      const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap`;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = fontUrl;
      document.head.appendChild(link);
      
      document.fonts.load(`16px "${font}"`).then(() => {
        setLoaded(prev => new Set(prev).add(font));
      });
    });
  }, [fonts]);
  
  return loaded;
};
```

### Glass Presets Definition
```typescript
const GLASS_PRESETS = {
  'crystal-clear': { blur: 5, opacity: 0.03, tint: null },
  'frosted-glass': { blur: 20, opacity: 0.08, tint: null },
  'dark-smoke': { blur: 30, opacity: 0.25, tint: '#1a1a1a' },
  'ocean-mist': { blur: 15, opacity: 0.1, tint: '#0066cc' },
  'sunset-glow': { blur: 18, opacity: 0.12, tint: '#ff6b35' },
  'midnight': { blur: 25, opacity: 0.35, tint: '#0d0d0d' },
  'arctic': { blur: 12, opacity: 0.05, tint: '#e0f4ff' },
  'cyberpunk': { blur: 22, opacity: 0.15, tint: '#ff00ff' },
  'minimal': { blur: 3, opacity: 0.02, tint: null },
  'classic': { blur: 20, opacity: 0.1, tint: null },
};
```

### Color Shift Implementation
```css
/* Applied via CSS filter */
.color-shifted {
  filter: brightness(calc(100% + var(--color-shift) * 0.5%));
}
```

---

## Summary

This comprehensive update transforms the app's customization capabilities with:
- Reduced header text for better mobile display
- Extended, readable date pill statistics
- Reorganized settings with dedicated Texts and Style tabs
- 10 glass UI presets for quick theming
- Collapsible flight cards for compact viewing
- Streamlined one-click notification subscriptions
- Glass-styled toasts and modals throughout
