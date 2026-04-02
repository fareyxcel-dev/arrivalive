

# Multi-Feature Update: PushAlert SW, Glass Styles, Glass Orb UI, Header, Fonts, Parallax Removal

## Summary
8 changes: replace SW with PushAlert import, add PushAlert script to index.html, remove parallax textures, add 3 glass presets (Vista/Aero/Polarized), use glass orb images for sliders/toggles, update header with menu icon, request notification on login, add 3 custom fonts.

---

## 1. Replace Service Worker with PushAlert SW

**File: `public/sw.js`**
Replace the entire current service worker with:
```js
importScripts("https://cdn.pushalert.co/sw-88425.js");
```
This is the uploaded `sw.js` — PushAlert requires its own service worker.

**Note:** The current SW has caching, background sync, push handling. All push handling will now be managed by PushAlert's imported SW. The existing caching/sync logic will be removed since PushAlert's SW handles notifications.

## 2. Add PushAlert Script to index.html

**File: `index.html`**
- Remove the OneSignal SDK script and init block (lines 51-65)
- Add before `</head>`:
```html
<script type="text/javascript">
  (function(d, t) {
    var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
    g.src = "https://cdn.pushalert.co/integrate_770494a54b29b2cc5b086ceecc33b7a3.js";
    s.parentNode.insertBefore(g, s);
  }(document, "script"));
</script>
```

**File: `src/lib/pushalert.ts`**
- Update the API key constant to use the Website ID: `770494a54b29b2cc5b086ceecc33b7a3`

## 3. Remove Parallax Textures

**File: `src/components/FlightCard.tsx`**
- Remove `scrollY` state and the scroll listener (lines 186-191)
- Remove `getCardTexture()` function call and all parallax-related `backgroundPosition` calculations
- Remove `isSemiOpaque` logic that applies parallax textures
- Keep opaque mode (glassOpacity=0) with solid gradient hex backgrounds, but remove `backgroundPosition: center ${scrollY * 0.05}px` and texture image overlays
- Simplify `getCardBgStyle()`: opaque mode uses solid gradient only, semi-opaque uses glass blur without texture images

**File: `src/lib/cardStyles.ts`**
- Remove all parallax texture URLs from `TEXTURE_URLS` (landedGlassParallax, etc.)
- Keep only the base gradient textures if needed for opaque mode, or remove entirely if not using texture images

## 4. Add 3 Glass Styles: Vista, Aero, Polarized

**File: `src/contexts/SettingsContext.tsx`**
Add to `GLASS_PRESETS`:
```typescript
'vista':      { blur: 16, opacity: 0.12, label: 'Vista',      description: 'Vista glass with glow',     tint: 'warm-white',  animation: 'glass-vista-glow',      saturateBoost: 1.2 },
'aero-win':   { blur: 14, opacity: 0.18, label: 'Aero',       description: 'Windows Aero style',        tint: 'blue-tint',   animation: 'glass-aero-sweep',      saturateBoost: 1.1 },
'polarized':  { blur: 10, opacity: 0.25, label: 'Polarized',  description: 'Dark, high contrast',       tint: 'dark',        animation: 'glass-polarized-shift', saturateBoost: 0.9 },
```

The existing `'aero'` entry labeled "Windows Aero" should be renamed or kept alongside. Looking at the reference screenshots, Vista and Aero are distinct. The current `'aero'` can stay as-is; add `'vista'` and `'polarized'` as new entries.

**File: `src/index.css`**
Add keyframes for `glass-vista-glow` and `glass-polarized-shift`.

## 5. Glass Orb Slider/Toggle Thumbs

The user wants sliders and toggles to use glass orb images from the provided ImageKit URL for a more glass-styled UI.

**File: `src/components/ui/slider.tsx`**
Replace the `SliderPrimitive.Thumb` with a custom styled thumb that uses the glass orb texture as background:
```tsx
<SliderPrimitive.Thumb 
  className="block h-6 w-6 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  style={{
    backgroundImage: `url(https://ik.imagekit.io/jv0j9qvtw/...)`,
    backgroundSize: 'cover',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 0 8px rgba(255,255,255,0.15)',
  }}
/>
```

**File: `src/components/SettingsModal.tsx`** (LiveBlurToggle)
Replace the toggle knob `div` with a glass orb image background, similar approach.

## 6. Update Header with Menu Icon

**File: `src/components/NewHeader.tsx`**
Based on the reference image, replace the right-side weather area or add a menu icon button using the ImageKit Menu.png icon:
`https://ik.imagekit.io/jv0j9qvtw/New%20Airline%20Logo%20Variants%20/Icons/Menu.png`

Add to `cardStyles.ts` UI_ICONS:
```typescript
menu: `${ICONS_BASE}Menu.png`,
```

In the header, replace the collapsed menu pill indicator with the Menu.png icon. When tapped, it toggles the menu open. The reference image shows a settings/equalizer icon on the right side of the header.

Update the header right area: add the menu icon as a visible button (instead of the tiny 4px pill under the logo). The logo click still toggles menu, but the Menu icon on the right provides an alternative trigger.

## 7. Request Notification Permission on Login

**File: `src/pages/Index.tsx`** or **`src/components/NewHeader.tsx`**
Add a `useEffect` that triggers when a user successfully logs in (auth state changes to signed-in):
```typescript
useEffect(() => {
  if (isLoggedIn) {
    // Request notification permission on new device login
    subscribeToNotifications().catch(() => {});
  }
}, [isLoggedIn]);
```

Import `subscribeToNotifications` from `@/lib/pushalert`.

## 8. Add 3 Custom Fonts + Similar Options

The user uploaded 3 font files:
- `modulus-pro-semi-bold.otf`
- `VisbyRoundCF-Bold.otf`
- `Arkitype-Modulus-Pro-Bold.otf`

**Action:**
- Copy uploaded fonts to `public/fonts/`
- Add `@font-face` declarations in `src/index.css`
- Add font names to `AVAILABLE_FONTS` in `src/contexts/SettingsContext.tsx`
- Also add similar Google Fonts options: `'Exo'`, `'Michroma'`, `'Aldrich'`, `'Khand'`, `'Saira Stencil One'`, `'Bruno Ace SC'`

```css
@font-face {
  font-family: 'Modulus Pro SemiBold';
  src: url('/fonts/modulus-pro-semi-bold.otf') format('opentype');
  font-weight: 600;
}
@font-face {
  font-family: 'Visby Round CF';
  src: url('/fonts/VisbyRoundCF-Bold.otf') format('opentype');
  font-weight: 700;
}
@font-face {
  font-family: 'Arkitype Modulus Pro';
  src: url('/fonts/Arkitype-Modulus-Pro-Bold.otf') format('opentype');
  font-weight: 700;
}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `public/sw.js` | Replace with PushAlert importScripts |
| `index.html` | Remove OneSignal, add PushAlert integration script |
| `src/lib/pushalert.ts` | Update API key to Website ID |
| `src/components/FlightCard.tsx` | Remove parallax scroll tracking and texture overlays |
| `src/lib/cardStyles.ts` | Remove parallax texture URLs, add menu icon |
| `src/contexts/SettingsContext.tsx` | Add Vista/Aero/Polarized glass presets, add custom fonts |
| `src/components/ui/slider.tsx` | Glass orb thumb styling |
| `src/components/SettingsModal.tsx` | Glass orb toggle knob |
| `src/components/NewHeader.tsx` | Add menu icon, notification on login |
| `src/index.css` | Glass preset keyframes, @font-face declarations |
| `public/fonts/` | 3 custom font files |

