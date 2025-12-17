import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Available fonts - commonly available web fonts
const AVAILABLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Oswald',
  'Raleway',
  'Merriweather',
  'Playfair Display',
  'Nunito',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Fira Sans',
  'Quicksand',
  'Karla',
  'Inconsolata',
  'Bebas Neue',
  'Orbitron',
  'Space Grotesk',
  'DM Sans',
  'Manrope',
  'Outfit',
  'Sora',
  'Plus Jakarta Sans',
  'Archivo',
  'Barlow',
  'Exo 2',
  'Titillium Web',
  'Rajdhani',
  'Chakra Petch',
];

interface SettingsState {
  fontFamily: string;
  fontSize: number;
  textCase: 'default' | 'uppercase' | 'lowercase';
  timeFormat: '12h' | '24h';
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
  toggleTimeFormat: () => void;
  setNotification: (key: keyof SettingsState['notifications'], value: boolean) => void;
}

const defaultSettings: SettingsState = {
  fontFamily: 'Inter',
  fontSize: 16,
  textCase: 'default',
  timeFormat: '24h',
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
    
    // Apply font to document
    document.documentElement.style.setProperty('--font-body', `'${settings.fontFamily}', sans-serif`);
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    
    // Load Google Font dynamically
    const fontLink = document.getElementById('dynamic-font') as HTMLLinkElement;
    const fontUrl = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
    
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

  const toggleTimeFormat = () => {
    setSettings(prev => ({ 
      ...prev, 
      timeFormat: prev.timeFormat === '12h' ? '24h' : '12h' 
    }));
  };

  const setNotification = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        availableFonts: AVAILABLE_FONTS,
        setFontFamily,
        setFontSize,
        setTextCase,
        toggleTimeFormat,
        setNotification,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
