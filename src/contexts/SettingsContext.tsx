import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extended fonts list - 200+ fonts for variety
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

interface SettingsState {
  fontFamily: string;
  fontSize: number;
  textCase: 'default' | 'uppercase' | 'lowercase';
  timeFormat: '12h' | '24h';
  temperatureUnit: 'C' | 'F';
  blurLevel: number;
  glassOpacity: number;
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
  toggleTimeFormat: () => void;
  toggleTemperatureUnit: () => void;
  setNotification: (key: keyof SettingsState['notifications'], value: boolean) => void;
  updateProfile: (data: { display_name?: string; phone?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const defaultSettings: SettingsState = {
  fontFamily: 'Inter',
  fontSize: 16,
  textCase: 'default',
  timeFormat: '24h',
  temperatureUnit: 'C',
  blurLevel: 20,
  glassOpacity: 0.1,
  notifications: {
    sms: false,
    email: false,
    push: true,
    repeat: false,
  },
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
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('arriva-settings', JSON.stringify(settings));
    
    // Apply font globally
    const fontFamily = `'${settings.fontFamily}', sans-serif`;
    
    document.documentElement.style.setProperty('--font-body', fontFamily);
    document.documentElement.style.setProperty('--font-display', fontFamily);
    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;
    
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
    document.body.style.textTransform = textTransform;
    
    // Apply blur and glass settings
    document.documentElement.style.setProperty('--glass-blur', `${settings.blurLevel}px`);
    document.documentElement.style.setProperty('--glass-opacity', `${settings.glassOpacity}`);
    
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
        background: rgba(255, 255, 255, ${settings.glassOpacity}) !important;
        backdrop-filter: blur(${settings.blurLevel}px) !important;
        -webkit-backdrop-filter: blur(${settings.blurLevel}px) !important;
      }
      
      .glass-blur-strong {
        background: rgba(0, 0, 0, ${settings.glassOpacity + 0.2}) !important;
        backdrop-filter: blur(${settings.blurLevel + 10}px) !important;
        -webkit-backdrop-filter: blur(${settings.blurLevel + 10}px) !important;
      }
      
      .terminal-group {
        background: rgba(255, 255, 255, ${settings.glassOpacity * 0.5}) !important;
        backdrop-filter: blur(${settings.blurLevel}px) !important;
        -webkit-backdrop-filter: blur(${settings.blurLevel}px) !important;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
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

  const setFontFamily = (font: string) => {
    setSettings(prev => ({ ...prev, fontFamily: font }));
  };

  const setFontSize = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const setTextCase = (textCase: 'default' | 'uppercase' | 'lowercase') => {
    setSettings(prev => ({ ...prev, textCase }));
  };

  const setBlurLevel = (level: number) => {
    setSettings(prev => ({ ...prev, blurLevel: level }));
  };

  const setGlassOpacity = (opacity: number) => {
    setSettings(prev => ({ ...prev, glassOpacity: opacity }));
  };

  const toggleTimeFormat = () => {
    setSettings(prev => ({ 
      ...prev, 
      timeFormat: prev.timeFormat === '12h' ? '24h' : '12h' 
    }));
  };

  const toggleTemperatureUnit = () => {
    setSettings(prev => ({ 
      ...prev, 
      temperatureUnit: prev.temperatureUnit === 'C' ? 'F' : 'C' 
    }));
  };

  const setNotification = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const updateProfile = async (data: { display_name?: string; phone?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

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
        setFontFamily,
        setFontSize,
        setTextCase,
        setBlurLevel,
        setGlassOpacity,
        toggleTimeFormat,
        toggleTemperatureUnit,
        setNotification,
        updateProfile,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
