import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extended fonts list
const AVAILABLE_FONTS = [
  'Poppins', 'Teko', 'Sulphur Point', 'Stick No Bills', 'Space Mono', 'Notable',
  'Archive', 'Bebas Neue', 'Oswald', 'Anton', 'Permanent Marker', 'Russo One',
  'Black Ops One', 'Bangers', 'Bungee', 'Audiowide', 'Orbitron', 'Electrolize',
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
  'Nunito', 'Ubuntu', 'Rubik', 'Work Sans', 'Fira Sans', 'Quicksand',
  'Karla', 'DM Sans', 'Manrope', 'Outfit', 'Sora', 'Plus Jakarta Sans',
  'Archivo', 'Barlow', 'Exo 2', 'Titillium Web', 'Mukta', 'Noto Sans',
  'Public Sans', 'Space Grotesk', 'Albert Sans', 'Figtree', 'Urbanist', 'Lexend',
  'Raleway', 'Nunito Sans', 'Hind', 'Asap', 'Catamaran', 'Heebo',
  'Overpass', 'Jost', 'Commissioner', 'Epilogue', 'Syne', 'Chivo',
  'Josefin Sans', 'Signika', 'Prompt', 'Sarabun', 'Mulish', 'Cairo',
  'Rajdhani', 'Chakra Petch', 'Kanit', 'Quantico', 'Play', 'Geo',
  'Iceland', 'Iceberg', 'Revalia', 'Odibee Sans', 'Big Shoulders Stencil',
  'Agdasima', 'Anta', 'Michroma', 'Oxanium', 'Saira', 'Sarpanch',
  'Share Tech', 'Share Tech Mono', 'Syncopate', 'Tomorrow', 'Turret Road',
  'PT Sans Narrow', 'Sofia Sans Extra Condensed', 'Yanone Kaffeesatz',
  'Bai Jamjuree', 'Smooch Sans', 'Tulpen One', 'Big Shoulders Display',
  'Saira Condensed', 'Barlow Condensed', 'Roboto Condensed', 'Fjalla One',
  'Pathway Gothic One', 'Encode Sans Condensed',
  'Playfair Display', 'Merriweather', 'Instrument Serif', 'Bona Nova SC',
  'Lora', 'Crimson Text', 'Libre Baskerville', 'EB Garamond',
  'Cormorant Garamond', 'Spectral', 'Source Serif Pro', 'Noto Serif',
  'Bitter', 'Domine', 'Vollkorn', 'Cardo', 'Frank Ruhl Libre',
  'Old Standard TT', 'Sorts Mill Goudy', 'Gilda Display', 'Rozha One',
  'Pacifico', 'Dancing Script', 'Great Vibes', 'Allura', 'Sacramento',
  'Satisfy', 'Tangerine', 'Alex Brush', 'Petit Formal Script', 'Pinyon Script',
  'Indie Flower', 'Caveat', 'Shadows Into Light', 'Amatic SC', 'Kaushan Script',
  'Courgette', 'Cookie', 'Yellowtail', 'Marck Script', 'Merienda',
  'Kelly Slab', 'Offside', 'Federant', 'Bahianita', 'Karantina',
  'Jaini Purva', 'Trochut', 'Sansita Swashed', 'Monoton', 'Abril Fatface',
  'Lobster', 'Lobster Two', 'Righteous', 'Philosopher', 'Comfortaa',
  'Fredoka', 'Baloo 2', 'Chewy', 'Concert One', 'Luckiest Guy',
  'Rampart One', 'Silkscreen', 'Special Elite', 'VT323', 'Press Start 2P',
  'Creepster', 'Nosifer', 'Metal Mania', 'Butcherman', 'Eater',
  'Inconsolata', 'Fira Code', 'JetBrains Mono', 'Source Code Pro',
  'IBM Plex Mono', 'Roboto Mono', 'Ubuntu Mono',
  'Courier Prime', 'Anonymous Pro', 'Cutive Mono', 'Major Mono Display',
  'Varela Round', 'Bubblegum Sans', 'Cherry Cream Soda', 'Coiny',
  'ZCOOL QingKe HuangYou', 'WDXL Lubrifont TC', 'Noto Sans JP',
  'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans Arabic',
];

// Glass Presets - 12 visually unique styles
export interface GlassPreset {
  blur: number; opacity: number; label: string; description: string;
  tint: string; animation: string; saturateBoost: number;
}
export const GLASS_PRESETS: Record<string, GlassPreset> = {
  'frosted':      { blur: 20, opacity: 0.08, label: 'Frosted Glass',       description: 'White frost shimmer',       tint: 'white',      animation: 'glass-frosted-shimmer',    saturateBoost: 1.1 },
  'liquid':       { blur: 35, opacity: 0.05, label: 'Liquid Glass',        description: 'Ripple distortion',         tint: 'none',       animation: 'glass-liquid-ripple',      saturateBoost: 1.4 },
  'prismatic':    { blur: 12, opacity: 0.06, label: 'Faceted Prismatic',   description: 'Rainbow border rotation',   tint: 'rainbow',    animation: 'glass-prismatic-rotate',   saturateBoost: 1.0 },
  'faceted':      { blur: 16, opacity: 0.10, label: 'Faceted Glass',       description: 'Multi-face reflections',    tint: 'cold-blue',  animation: 'glass-faceted-reflect',    saturateBoost: 1.2 },
  'metallic':     { blur: 8,  opacity: 0.14, label: 'Metallic',            description: 'Chrome reflection sweep',   tint: 'silver',     animation: 'glass-metallic-sweep',     saturateBoost: 0.8 },
  'beveled':      { blur: 4,  opacity: 0.22, label: 'Beveled Solid',       description: 'Hard-edge bevel shadow',    tint: 'dark',       animation: 'glass-beveled-press',      saturateBoost: 1.0 },
  'ios-liquid':   { blur: 28, opacity: 0.07, label: 'iOS Liquid Glass',    description: 'High vibrancy bounce',      tint: 'none',       animation: 'glass-ios-vibrancy',       saturateBoost: 1.8 },
  'aero':         { blur: 14, opacity: 0.20, label: 'Windows Aero',        description: 'Blue-tint glass sweep',     tint: 'blue-tint',  animation: 'glass-aero-sweep',         saturateBoost: 1.0 },
  'material':     { blur: 18, opacity: 0.09, label: 'Android Material',    description: 'Material elevation ripple', tint: 'none',       animation: 'glass-material-ripple',    saturateBoost: 1.3 },
  'opaque':       { blur: 0,  opacity: 0.35, label: 'Opaque',              description: 'Solid frosted background',  tint: 'dark',       animation: '',                         saturateBoost: 1.0 },
  'retro':        { blur: 2,  opacity: 0.18, label: 'Retro Pixelated',     description: 'Pixel-grid overlay',        tint: 'green-retro',animation: 'glass-retro-pixel',        saturateBoost: 1.0 },
  'clear':        { blur: 0,  opacity: 0.0,  label: 'Clear',               description: 'Fully transparent',         tint: 'none',       animation: '',                         saturateBoost: 1.0 },
};

interface SettingsState {
  fontFamily: string;
  fontSize: number;
  textCase: 'default' | 'uppercase' | 'lowercase';
  timeFormat: '12h' | '24h';
  temperatureUnit: 'C' | 'F';
  blurLevel: number;
  glassOpacity: number;
  iframeBrightness: number;
  saturation: number;
  contrast: number;
  shadows: number;
  highlights: number;
  hueShift: number;
  glassPreset: string;
  boldText: boolean;
  dualGlass: boolean;
  dualGlassStyle1: string;
  dualGlassStyle2: string;
  cardStyle: string;
  hideCancelled: boolean;
  hideLanded: boolean;
  // Card visual adjustments
  cardLogoBrightness: number;
  cardLogoContrast: number;
  cardLogoSaturation: number;
  cardLogoHueShift: number;
  cardTextBrightness: number;
  cardTextSaturation: number;
  cardUnifiedAdjust: boolean;
  // Text visual adjustments
  textBrightness: number;
  textContrast: number;
  textSaturation: number;
  textHueShift: number;
  textShadowX: number;
  textShadowY: number;
  textShadowBlur: number;
  textShadowOpacity: number;
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
    repeat: boolean;
  };
}

interface SettingsContextType {
  settings: SettingsState;
  availableFonts: string[];
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  setTextCase: (textCase: 'default' | 'uppercase' | 'lowercase') => void;
  setBlurLevel: (level: number) => void;
  setGlassOpacity: (opacity: number) => void;
  setIframeBrightness: (value: number) => void;
  setSaturation: (value: number) => void;
  setContrast: (value: number) => void;
  setShadows: (value: number) => void;
  setHighlights: (value: number) => void;
  setHueShift: (value: number) => void;
  setGlassPreset: (preset: string) => void;
  setBoldText: (enabled: boolean) => void;
  setDualGlass: (enabled: boolean) => void;
  setDualGlassStyle1: (preset: string) => void;
  setDualGlassStyle2: (preset: string) => void;
  setCardStyle: (style: string) => void;
  setHideCancelled: (hide: boolean) => void;
  setHideLanded: (hide: boolean) => void;
  setCardLogoBrightness: (v: number) => void;
  setCardLogoContrast: (v: number) => void;
  setCardLogoSaturation: (v: number) => void;
  setCardLogoHueShift: (v: number) => void;
  setCardTextBrightness: (v: number) => void;
  setCardTextSaturation: (v: number) => void;
  setTextBrightness: (v: number) => void;
  setTextContrast: (v: number) => void;
  setTextSaturation: (v: number) => void;
  setTextHueShift: (v: number) => void;
  setTextShadowX: (v: number) => void;
  setTextShadowY: (v: number) => void;
  setTextShadowBlur: (v: number) => void;
  setTextShadowOpacity: (v: number) => void;
  toggleTimeFormat: () => void;
  toggleTemperatureUnit: () => void;
  setNotification: (key: keyof SettingsState['notifications'], value: boolean) => void;
  updateProfile: (data: { display_name?: string; phone?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  resetSetting: (key: string) => void;
}

const defaultSettings: SettingsState = {
  fontFamily: 'Inter',
  fontSize: 16,
  textCase: 'default',
  timeFormat: '24h',
  temperatureUnit: 'C',
  blurLevel: 20,
  glassOpacity: 0.1,
  iframeBrightness: 100,
  saturation: 100,
  contrast: 100,
  shadows: 50,
  highlights: 50,
  hueShift: 0,
  glassPreset: 'frosted',
  boldText: false,
  dualGlass: false,
  dualGlassStyle1: 'frosted',
  dualGlassStyle2: 'ios-liquid',
  cardStyle: 'plain-main',
  hideCancelled: false,
  hideLanded: false,
  cardLogoBrightness: 100,
  cardLogoContrast: 100,
  cardLogoSaturation: 100,
  cardLogoHueShift: 0,
  cardTextBrightness: 100,
  cardTextSaturation: 100,
  textBrightness: 100,
  textContrast: 100,
  textSaturation: 100,
  textHueShift: 0,
  textShadowX: 0,
  textShadowY: 1,
  textShadowBlur: 3,
  textShadowOpacity: 50,
  notifications: {
    sms: false,
    email: false,
    push: true,
    repeat: false,
  },
};

// Migrate old settings
const migrateSettings = (saved: any): SettingsState => {
  const migrated = { ...defaultSettings, ...saved };
  if ('monochrome' in saved && !('saturation' in saved)) {
    if (saved.monochrome && saved.monochromeIntensity !== undefined) {
      migrated.saturation = Math.max(0, 100 - saved.monochromeIntensity);
    }
  }
  if ('monoContrast' in saved && !('contrast' in saved)) migrated.contrast = saved.monoContrast;
  if ('monoShadows' in saved && !('shadows' in saved)) migrated.shadows = saved.monoShadows;
  if ('monoHighlights' in saved && !('highlights' in saved)) migrated.highlights = saved.monoHighlights;
  // Migrate colorShift removal
  delete migrated.colorShift;
  delete migrated.monochrome;
  delete migrated.monochromeIntensity;
  delete migrated.monoContrast;
  delete migrated.monoShadows;
  delete migrated.monoHighlights;
  // Migrate old glass preset keys to new ones
  if (migrated.glassPreset && !GLASS_PRESETS[migrated.glassPreset]) {
    migrated.glassPreset = 'frosted';
  }
  if (migrated.dualGlassStyle1 && !GLASS_PRESETS[migrated.dualGlassStyle1]) {
    migrated.dualGlassStyle1 = 'frosted';
  }
  if (migrated.dualGlassStyle2 && !GLASS_PRESETS[migrated.dualGlassStyle2]) {
    migrated.dualGlassStyle2 = 'ios-liquid';
  }
  return migrated;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('arriva-settings');
    return saved ? migrateSettings(JSON.parse(saved)) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('arriva-settings', JSON.stringify(settings));
    
    let effectiveBlur = settings.blurLevel;
    let effectiveOpacity = settings.glassOpacity;

    if (settings.dualGlass) {
      const p1 = GLASS_PRESETS[settings.dualGlassStyle1];
      const p2 = GLASS_PRESETS[settings.dualGlassStyle2];
      if (p1 && p2) {
        effectiveBlur = Math.round((p1.blur + p2.blur) / 2);
        effectiveOpacity = (p1.opacity + p2.opacity) / 2;
      }
    }

    const currentPreset = GLASS_PRESETS[settings.glassPreset];

    const fontFamily = `'${settings.fontFamily}', sans-serif`;
    
    document.documentElement.style.setProperty('--font-body', fontFamily);
    document.documentElement.style.setProperty('--font-display', fontFamily);
    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;
    
    let textTransform: string;
    switch (settings.textCase) {
      case 'uppercase': textTransform = 'uppercase'; break;
      case 'lowercase': textTransform = 'lowercase'; break;
      default: textTransform = 'none';
    }
    document.documentElement.style.setProperty('--text-case', textTransform);
    document.body.style.textTransform = textTransform;
    
    document.documentElement.style.setProperty('--glass-blur', `${effectiveBlur}px`);
    document.documentElement.style.setProperty('--glass-opacity', `${effectiveOpacity}`);
    document.documentElement.style.setProperty('--iframe-brightness', `${settings.iframeBrightness}%`);
    document.documentElement.style.setProperty('--font-weight', settings.boldText ? '700' : '400');
    
    const shadowOpacity = Math.max(0.2, Math.min(0.8, settings.iframeBrightness / 150));
    document.documentElement.style.setProperty('--shadow-opacity', `${shadowOpacity.toFixed(2)}`);

    // Text visual adjustments as CSS custom properties
    document.documentElement.style.setProperty('--text-brightness', `${settings.textBrightness}%`);
    document.documentElement.style.setProperty('--text-contrast', `${settings.textContrast}%`);
    document.documentElement.style.setProperty('--text-saturation', `${settings.textSaturation}%`);
    document.documentElement.style.setProperty('--text-hue-shift', `${settings.textHueShift}deg`);
    document.documentElement.style.setProperty('--text-shadow-x', `${settings.textShadowX}px`);
    document.documentElement.style.setProperty('--text-shadow-y', `${settings.textShadowY}px`);
    document.documentElement.style.setProperty('--text-shadow-blur', `${settings.textShadowBlur}px`);
    document.documentElement.style.setProperty('--text-shadow-opacity', `${(settings.textShadowOpacity / 100).toFixed(2)}`);
    
    let globalStyle = document.getElementById('global-font-style');
    if (!globalStyle) {
      globalStyle = document.createElement('style');
      globalStyle.id = 'global-font-style';
      document.head.appendChild(globalStyle);
    }
    
    globalStyle.textContent = `
      html, body {
        font-family: ${fontFamily} !important;
        text-transform: ${textTransform} !important;
      }
      
      *, *::before, *::after {
        font-family: inherit !important;
      }
      
      [data-radix-portal],
      [data-radix-portal] *,
      [data-radix-popper-content-wrapper],
      [data-radix-popper-content-wrapper] *,
      [role="dialog"], [role="dialog"] *,
      [role="menu"], [role="menu"] *,
      [role="listbox"], [role="listbox"] *,
      [role="tooltip"], [role="tooltip"] *,
      .modal-overlay, .modal-overlay *,
      [data-state="open"], [data-state="open"] *,
      .glass, .glass *,
      .glass-blur-strong, .glass-blur-strong *,
      header, header *,
      main, main *,
      button, input, select, textarea, label, span, p, h1, h2, h3, h4, h5, h6, div, a {
        font-family: ${fontFamily} !important;
        text-transform: ${textTransform} !important;
      }
      
      .glass {
        background: rgba(255, 255, 255, ${effectiveOpacity}) !important;
        backdrop-filter: blur(${effectiveBlur}px) !important;
        -webkit-backdrop-filter: blur(${effectiveBlur}px) !important;
      }
      
      .glass-blur-strong {
        background: rgba(0, 0, 0, ${effectiveOpacity + 0.2}) !important;
        backdrop-filter: blur(${effectiveBlur + 10}px) !important;
        -webkit-backdrop-filter: blur(${effectiveBlur + 10}px) !important;
      }
      
      .terminal-group {
        background: rgba(255, 255, 255, ${effectiveOpacity * 0.5}) !important;
        backdrop-filter: blur(${effectiveBlur}px) !important;
        -webkit-backdrop-filter: blur(${effectiveBlur}px) !important;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      ${currentPreset?.animation ? `
      .terminal-group, .glass-neumorphic {
        ${currentPreset.animation === 'glass-frosted-shimmer' ? 'background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%, transparent 100%); background-size: 200% 100%; animation: glass-frosted-shimmer 6s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-liquid-ripple' ? 'animation: glass-liquid-ripple 4s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-prismatic-rotate' ? 'animation: glass-prismatic-rotate 8s linear infinite;' : ''}
        ${currentPreset.animation === 'glass-faceted-reflect' ? 'animation: glass-faceted-reflect 5s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-metallic-sweep' ? 'background-image: linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%); background-size: 200% 100%; animation: glass-metallic-sweep 4s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-beveled-press' ? 'animation: glass-beveled-press 0.3s ease-out forwards;' : ''}
        ${currentPreset.animation === 'glass-ios-vibrancy' ? 'animation: glass-ios-vibrancy 0.4s ease-out forwards; filter: saturate(1.8);' : ''}
        ${currentPreset.animation === 'glass-aero-sweep' ? 'position: relative; overflow: hidden;' : ''}
        ${currentPreset.animation === 'glass-material-ripple' ? 'animation: glass-material-ripple 3s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-retro-pixel' ? 'animation: glass-retro-pixel 2s step-end infinite;' : ''}
      }
      ` : ''}
      
      ${settings.boldText ? `
        body, html, *, *::before, *::after {
          font-weight: 700 !important;
        }
      ` : ''}
    `;
    
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    
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

  const setFontFamily = (font: string) => setSettings(prev => ({ ...prev, fontFamily: font }));
  const setFontSize = (size: number) => setSettings(prev => ({ ...prev, fontSize: size }));
  const setTextCase = (textCase: 'default' | 'uppercase' | 'lowercase') => setSettings(prev => ({ ...prev, textCase }));
  const setBlurLevel = (level: number) => setSettings(prev => ({ ...prev, blurLevel: level }));
  const setGlassOpacity = (opacity: number) => setSettings(prev => ({ ...prev, glassOpacity: opacity }));
  const setIframeBrightness = (value: number) => setSettings(prev => ({ ...prev, iframeBrightness: value }));
  const setSaturation = (value: number) => setSettings(prev => ({ ...prev, saturation: value }));
  const setContrast = (value: number) => setSettings(prev => ({ ...prev, contrast: value }));
  const setShadows = (value: number) => setSettings(prev => ({ ...prev, shadows: value }));
  const setHighlights = (value: number) => setSettings(prev => ({ ...prev, highlights: value }));
  const setHueShift = (value: number) => setSettings(prev => ({ ...prev, hueShift: value }));
  const setBoldText = (enabled: boolean) => setSettings(prev => ({ ...prev, boldText: enabled }));
  const setDualGlass = (enabled: boolean) => setSettings(prev => ({ ...prev, dualGlass: enabled }));
  const setDualGlassStyle1 = (preset: string) => setSettings(prev => ({ ...prev, dualGlassStyle1: preset }));
  const setDualGlassStyle2 = (preset: string) => setSettings(prev => ({ ...prev, dualGlassStyle2: preset }));
  const setCardStyle = (style: string) => setSettings(prev => ({ ...prev, cardStyle: style }));
  const setHideCancelled = (hide: boolean) => setSettings(prev => ({ ...prev, hideCancelled: hide }));
  const setHideLanded = (hide: boolean) => setSettings(prev => ({ ...prev, hideLanded: hide }));
  const setCardLogoBrightness = (v: number) => setSettings(prev => ({ ...prev, cardLogoBrightness: v }));
  const setCardLogoContrast = (v: number) => setSettings(prev => ({ ...prev, cardLogoContrast: v }));
  const setCardLogoSaturation = (v: number) => setSettings(prev => ({ ...prev, cardLogoSaturation: v }));
  const setCardLogoHueShift = (v: number) => setSettings(prev => ({ ...prev, cardLogoHueShift: v }));
  const setCardTextBrightness = (v: number) => setSettings(prev => ({ ...prev, cardTextBrightness: v }));
  const setCardTextSaturation = (v: number) => setSettings(prev => ({ ...prev, cardTextSaturation: v }));
  const setTextBrightness = (v: number) => setSettings(prev => ({ ...prev, textBrightness: v }));
  const setTextContrast = (v: number) => setSettings(prev => ({ ...prev, textContrast: v }));
  const setTextSaturation = (v: number) => setSettings(prev => ({ ...prev, textSaturation: v }));
  const setTextHueShift = (v: number) => setSettings(prev => ({ ...prev, textHueShift: v }));
  const setTextShadowX = (v: number) => setSettings(prev => ({ ...prev, textShadowX: v }));
  const setTextShadowY = (v: number) => setSettings(prev => ({ ...prev, textShadowY: v }));
  const setTextShadowBlur = (v: number) => setSettings(prev => ({ ...prev, textShadowBlur: v }));
  const setTextShadowOpacity = (v: number) => setSettings(prev => ({ ...prev, textShadowOpacity: v }));

  const setGlassPreset = (preset: string) => {
    const presetValues = GLASS_PRESETS[preset];
    if (presetValues) {
      setSettings(prev => ({
        ...prev,
        glassPreset: preset,
        blurLevel: presetValues.blur,
        glassOpacity: presetValues.opacity,
      }));
    } else {
      setSettings(prev => ({ ...prev, glassPreset: preset }));
    }
  };

  const toggleTimeFormat = () => setSettings(prev => ({ ...prev, timeFormat: prev.timeFormat === '12h' ? '24h' : '12h' }));
  const toggleTemperatureUnit = () => setSettings(prev => ({ ...prev, temperatureUnit: prev.temperatureUnit === 'C' ? 'F' : 'C' }));
  const setNotification = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  };

  const resetSetting = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: (defaultSettings as any)[key] }));
  };

  const updateProfile = async (data: { display_name?: string; phone?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, ...data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const deleteAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await supabase.from('profiles').delete().eq('user_id', user.id);
    await supabase.from('notification_subscriptions').delete().eq('user_id', user.id);
    await supabase.auth.signOut();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        availableFonts: AVAILABLE_FONTS,
        setFontFamily, setFontSize, setTextCase,
        setBlurLevel, setGlassOpacity, setIframeBrightness,
        setSaturation, setContrast, setShadows, setHighlights, setHueShift,
        setGlassPreset, setBoldText,
        setDualGlass, setDualGlassStyle1, setDualGlassStyle2,
        setCardStyle, setHideCancelled, setHideLanded,
        setCardLogoBrightness, setCardLogoContrast, setCardLogoSaturation, setCardLogoHueShift,
        setCardTextBrightness, setCardTextSaturation,
        setTextBrightness, setTextContrast, setTextSaturation, setTextHueShift,
        setTextShadowX, setTextShadowY, setTextShadowBlur, setTextShadowOpacity,
        toggleTimeFormat, toggleTemperatureUnit,
        setNotification, updateProfile, updatePassword, deleteAccount,
        resetSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
