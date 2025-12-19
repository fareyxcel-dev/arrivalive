import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extended fonts list - 50+ fonts including user requested ones
const AVAILABLE_FONTS = [
  // Original fonts
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
  // User requested fonts
  'PT Sans Narrow',
  'Instrument Serif',
  'Bona Nova SC',
  'Yanone Kaffeesatz',
  'Bai Jamjuree',
  'Sofia Sans Extra Condensed',
  'Agdasima',
  'Kanit',
  'Teko',
  'ZCOOL QingKe HuangYou',
  'Kelly Slab',
  'Tulpen One',
  'Offside',
  'Big Shoulders Stencil',
  'Odibee Sans',
  'Revalia',
  'Smooch Sans',
  'Anta',
  'WDXL Lubrifont TC',
  'Iceberg',
  'Iceland',
  'Geo',
  'Electrolize',
  'Quantico',
  'Audiowide',
  'Sansita Swashed',
  'Trochut',
  'Play',
  'Jaini Purva',
  'Karantina',
  'Federant',
  'Bahianita',
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
  updateProfile: (data: { display_name?: string; phone?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
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

    // Delete user data from profiles
    await supabase.from('profiles').delete().eq('user_id', user.id);
    await supabase.from('notification_subscriptions').delete().eq('user_id', user.id);
    
    // Sign out
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
        toggleTimeFormat,
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
