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

// Glass Presets - OS/design-inspired with unique tint/animation/saturate
export interface GlassPreset {
  blur: number; opacity: number; label: string; description: string;
  tint: string; animation: string; saturateBoost: number;
}
export const GLASS_PRESETS: Record<string, GlassPreset> = {
  'frosted':    { blur: 20, opacity: 0.08, label: 'Frosted',    description: 'Shimmer frost',        tint: 'white',      animation: 'glass-frosted-shimmer',    saturateBoost: 1.1 },
  'liquid':     { blur: 35, opacity: 0.05, label: 'Liquid',     description: 'Ripple distortion',     tint: 'none',       animation: 'glass-liquid-ripple',      saturateBoost: 1.4 },
  'prismatic':  { blur: 12, opacity: 0.06, label: 'Prismatic',  description: 'Rainbow border',        tint: 'rainbow',    animation: 'glass-prismatic-rotate',   saturateBoost: 1.0 },
  'stained':    { blur: 18, opacity: 0.15, label: 'Stained',    description: 'Warm amber pulse',      tint: 'amber',      animation: 'glass-stained-pulse',      saturateBoost: 1.0 },
  'polarized':  { blur: 25, opacity: 0.10, label: 'Polarized',  description: 'Glitch flash',          tint: 'cold-blue',  animation: 'glass-polarized-glitch',   saturateBoost: 1.2 },
  'ios':        { blur: 25, opacity: 0.08, label: 'iOS',        description: 'Vibrancy bounce',       tint: 'none',       animation: 'glass-ios-vibrancy',       saturateBoost: 1.8 },
  'aero':       { blur: 14, opacity: 0.20, label: 'Aero',       description: 'Glass reflection',      tint: 'blue-tint',  animation: 'glass-aero-sweep',         saturateBoost: 1.0 },
  'vista':      { blur: 8,  opacity: 0.25, label: 'Vista',      description: 'Thick glass wobble',    tint: 'green-tint', animation: 'glass-vista-wobble',       saturateBoost: 1.1 },
  'windows':    { blur: 18, opacity: 0.12, label: 'Windows',    description: 'Acrylic noise',         tint: 'noise',      animation: 'glass-windows-noise',      saturateBoost: 1.0 },
  'linux':      { blur: 4,  opacity: 0.04, label: 'Linux',      description: 'Terminal blink',        tint: 'none',       animation: 'glass-linux-blink',        saturateBoost: 1.0 },
  'mac':        { blur: 22, opacity: 0.07, label: 'Mac',        description: 'Warm vibrancy',         tint: 'warm',       animation: 'glass-mac-fadein',         saturateBoost: 1.3 },
  'ubuntu':     { blur: 10, opacity: 0.18, label: 'Ubuntu',     description: 'Orange glow pulse',     tint: 'orange',     animation: 'glass-ubuntu-glow',        saturateBoost: 1.0 },
  'nintendo':   { blur: 16, opacity: 0.10, label: 'Nintendo',   description: 'Playful bounce',        tint: 'red',        animation: 'glass-nintendo-bounce',    saturateBoost: 1.2 },
  'playstation':{ blur: 20, opacity: 0.09, label: 'PlayStation',description: 'Blue pulse wave',       tint: 'deep-blue',  animation: 'glass-ps-pulse',           saturateBoost: 1.3 },
  'xbox':       { blur: 15, opacity: 0.11, label: 'Xbox',       description: 'Green matrix rain',     tint: 'green',      animation: 'glass-xbox-matrix',        saturateBoost: 1.2 },
  'rog':        { blur: 22, opacity: 0.07, label: 'ROG',        description: 'Red slash sweep',       tint: 'red-dark',   animation: 'glass-rog-slash',          saturateBoost: 1.4 },
  'nokia':      { blur: 6,  opacity: 0.20, label: 'Nokia',      description: 'Retro pixel fade',      tint: 'blue-retro', animation: 'glass-nokia-pixel',        saturateBoost: 1.0 },
  'samsung':    { blur: 24, opacity: 0.06, label: 'Samsung',    description: 'One UI gradient',       tint: 'blue-light', animation: 'glass-samsung-gradient',   saturateBoost: 1.5 },
  'iphone':     { blur: 28, opacity: 0.07, label: 'iPhone',     description: 'Dynamic Island pop',    tint: 'none',       animation: 'glass-iphone-island',      saturateBoost: 1.8 },
  'blackberry': { blur: 10, opacity: 0.22, label: 'BlackBerry', description: 'Corporate matte',       tint: 'dark',       animation: 'glass-bb-matte',           saturateBoost: 1.0 },
  'raspberry':  { blur: 12, opacity: 0.14, label: 'Raspberry',  description: 'Pi circuit glow',       tint: 'raspberry',  animation: 'glass-rpi-circuit',        saturateBoost: 1.1 },
  'steam':      { blur: 18, opacity: 0.10, label: 'Steam',      description: 'Dark vapor drift',      tint: 'steam-dark', animation: 'glass-steam-vapor',        saturateBoost: 1.2 },
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
  saturation: number; // 0-200, default 100. 0=grayscale, 100=normal, 200=oversaturated
  contrast: number;   // 50-150, default 100
  shadows: number;    // 0-100, default 50
  highlights: number; // 0-100, default 50
  hueShift: number;   // 0-360, default 0
  glassPreset: string;
  boldText: boolean;
  colorShift: number;
  dualGlass: boolean;
  dualGlassStyle1: string;
  dualGlassStyle2: string;
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
  setColorShift: (value: number) => void;
  setDualGlass: (enabled: boolean) => void;
  setDualGlassStyle1: (preset: string) => void;
  setDualGlassStyle2: (preset: string) => void;
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
  colorShift: 0,
  dualGlass: false,
  dualGlassStyle1: 'frosted',
  dualGlassStyle2: 'ios',
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
  // Migrate monochrome → saturation
  if ('monochrome' in saved && !('saturation' in saved)) {
    if (saved.monochrome && saved.monochromeIntensity !== undefined) {
      migrated.saturation = Math.max(0, 100 - saved.monochromeIntensity);
    }
  }
  if ('monoContrast' in saved && !('contrast' in saved)) {
    migrated.contrast = saved.monoContrast;
  }
  if ('monoShadows' in saved && !('shadows' in saved)) {
    migrated.shadows = saved.monoShadows;
  }
  if ('monoHighlights' in saved && !('highlights' in saved)) {
    migrated.highlights = saved.monoHighlights;
  }
  // Remove old keys
  delete migrated.monochrome;
  delete migrated.monochromeIntensity;
  delete migrated.monoContrast;
  delete migrated.monoShadows;
  delete migrated.monoHighlights;
  return migrated;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('arriva-settings');
    return saved ? migrateSettings(JSON.parse(saved)) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('arriva-settings', JSON.stringify(settings));
    
    // Compute effective blur/opacity (dual glass blending)
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

    // Apply font globally
    const fontFamily = `'${settings.fontFamily}', sans-serif`;
    
    document.documentElement.style.setProperty('--font-body', fontFamily);
    document.documentElement.style.setProperty('--font-display', fontFamily);
    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;
    
    // Apply text case
    let textTransform: string;
    switch (settings.textCase) {
      case 'uppercase': textTransform = 'uppercase'; break;
      case 'lowercase': textTransform = 'lowercase'; break;
      default: textTransform = 'none';
    }
    document.documentElement.style.setProperty('--text-case', textTransform);
    document.body.style.textTransform = textTransform;
    
    // Apply blur and glass settings
    document.documentElement.style.setProperty('--glass-blur', `${effectiveBlur}px`);
    document.documentElement.style.setProperty('--glass-opacity', `${effectiveOpacity}`);
    document.documentElement.style.setProperty('--iframe-brightness', `${settings.iframeBrightness}%`);
    document.documentElement.style.setProperty('--font-weight', settings.boldText ? '700' : '400');
    document.documentElement.style.setProperty('--color-shift', `${settings.colorShift}`);
    
    // Compute adaptive shadow opacity from brightness
    const shadowOpacity = Math.max(0.2, Math.min(0.8, settings.iframeBrightness / 150));
    document.documentElement.style.setProperty('--shadow-opacity', `${shadowOpacity.toFixed(2)}`);
    
    // Inject comprehensive global styles
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
        ${currentPreset.animation === 'glass-stained-pulse' ? 'animation: glass-stained-pulse 5s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-polarized-glitch' ? 'animation: glass-polarized-glitch 8s ease infinite; filter: contrast(1.2);' : ''}
        ${currentPreset.animation === 'glass-ios-vibrancy' ? 'animation: glass-ios-vibrancy 0.4s ease-out forwards; filter: saturate(1.8);' : ''}
        ${currentPreset.animation === 'glass-vista-wobble' ? 'animation: glass-vista-wobble 7s ease-in-out infinite; filter: brightness(1.1);' : ''}
        ${currentPreset.animation === 'glass-linux-blink' ? 'animation: glass-linux-blink 1.2s step-end infinite;' : ''}
        ${currentPreset.animation === 'glass-mac-fadein' ? 'animation: glass-mac-fadein 0.6s ease-out forwards;' : ''}
        ${currentPreset.animation === 'glass-ubuntu-glow' ? 'animation: glass-ubuntu-glow 4s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-nintendo-bounce' ? 'animation: glass-nintendo-bounce 3s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-ps-pulse' ? 'animation: glass-ps-pulse 5s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-iphone-island' ? 'animation: glass-iphone-island 4s ease-in-out infinite; filter: saturate(1.8);' : ''}
        ${currentPreset.animation === 'glass-rpi-circuit' ? 'animation: glass-rpi-circuit 5s ease-in-out infinite;' : ''}
        ${currentPreset.animation === 'glass-steam-vapor' ? 'background-image: linear-gradient(135deg, rgba(30,30,30,0.05) 25%, transparent 25%, transparent 50%, rgba(30,30,30,0.05) 50%, rgba(30,30,30,0.05) 75%, transparent 75%); background-size: 40px 40px; animation: glass-steam-vapor 10s linear infinite;' : ''}
      }
      ` : ''}
      
      ${settings.boldText ? `
        body, html, *, *::before, *::after {
          font-weight: 700 !important;
        }
      ` : ''}
    `;
    
    // Apply font size
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    
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
  const setColorShift = (value: number) => setSettings(prev => ({ ...prev, colorShift: value }));
  const setDualGlass = (enabled: boolean) => setSettings(prev => ({ ...prev, dualGlass: enabled }));
  const setDualGlassStyle1 = (preset: string) => setSettings(prev => ({ ...prev, dualGlassStyle1: preset }));
  const setDualGlassStyle2 = (preset: string) => setSettings(prev => ({ ...prev, dualGlassStyle2: preset }));

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
        setGlassPreset, setBoldText, setColorShift,
        setDualGlass, setDualGlassStyle1, setDualGlassStyle2,
        toggleTimeFormat, toggleTemperatureUnit,
        setNotification, updateProfile, updatePassword, deleteAccount,
        resetSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
