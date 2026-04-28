import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Download, Settings, LogIn, LogOut, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/header-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';
import { UI_ICONS } from '@/lib/cardStyles';
import { subscribeToNotifications, setExternalUserId } from '@/lib/pushalert';

interface WeatherData {
  temp: number;
  condition: string;
  sunrise?: string;
  sunset?: string;
  forecast?: {
    nextCondition: string;
    timeToChange: number;
  };
  chanceOfRain?: number;
  hourlyForecast?: Array<{
    time: string;
    condition: string;
    temp: number;
    chanceOfRain: number;
  }>;
}

interface Props {
  onForceRefresh: () => void;
  onExportSchedule: () => void;
  onOpenSettings: () => void;
  isLoggedIn: boolean;
  onAuthAction: () => void;
  onInstallPWA: () => void;
  userEmail?: string;
  onAdminExport?: () => void;
  onOpenNotifications?: () => void;
  onOpenAdmin?: () => void;
  notificationCount?: number;
  weather: WeatherData | null;
  currentTime: Date;
}

const DEFAULT_SUNRISE = '06:07';
const DEFAULT_SUNSET = '18:00';

const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const formatCountdown = (minutes: number): string => {
  if (minutes <= 0) return 'now';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const NewHeader = ({
  onForceRefresh, onExportSchedule, onOpenSettings, isLoggedIn, onAuthAction,
  onInstallPWA, userEmail, onAdminExport, onOpenNotifications, onOpenAdmin,
  notificationCount = 0, weather, currentTime,
}: Props) => {
  const { settings, toggleTimeFormat, toggleTemperatureUnit } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSunCountdown, setShowSunCountdown] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [sunCountdownTimeout, setSunCountdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [forecastTimeout, setForecastTimeout] = useState<NodeJS.Timeout | null>(null);
  const menuAutoCloseRef = useRef<NodeJS.Timeout | null>(null);

  const hours = currentTime.getHours();
  const isDay = hours >= 6 && hours < 18;
  const sunrise = weather?.sunrise || DEFAULT_SUNRISE;
  const sunset = weather?.sunset || DEFAULT_SUNSET;

  // Check admin role on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, [isLoggedIn]);

  // Request notification permission on login
  useEffect(() => {
    if (!isLoggedIn) return;
    const requestNotifPermission = async () => {
      try {
        const subscriberId = await subscribeToNotifications();
        if (subscriberId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await setExternalUserId(user.id);
            await supabase.from('profiles').upsert(
              { user_id: user.id, onesignal_player_id: subscriberId },
              { onConflict: 'user_id' }
            );
          }
        }
      } catch (e) {
        console.warn('Notification permission request failed:', e);
      }
    };
    requestNotifPermission();
  }, [isLoggedIn]);

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIsScrolled(window.scrollY > 50));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Responsive viewport size buckets — keeps both dual-text rows on a single
  // line down to 320px without wrapping or colliding with logo/menu.
  const [vw, setVw] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 420
  );
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const sizeMode: 'xs' | 'sm' | 'md' = vw < 360 ? 'xs' : vw < 420 ? 'sm' : 'md';
  const primaryTextClass = sizeMode === 'xs' ? 'text-[10px]' : sizeMode === 'sm' ? 'text-[11px]' : 'text-[13px]';
  const secondaryTextClass = sizeMode === 'xs' ? 'text-[8px]' : sizeMode === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const secondaryMaxW = sizeMode === 'xs' ? 'max-w-[120px]' : sizeMode === 'sm' ? 'max-w-[160px]' : 'max-w-[220px]';
  const dateSep = sizeMode === 'xs' ? ' ' : ' · ';

  // Auto-close menu after 4 seconds of no interaction
  useEffect(() => {
    if (!isMenuOpen) return;
    menuAutoCloseRef.current = setTimeout(() => setIsMenuOpen(false), 4000);
    return () => { if (menuAutoCloseRef.current) clearTimeout(menuAutoCloseRef.current); };
  }, [isMenuOpen]);

  useEffect(() => {
    return () => {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      if (forecastTimeout) clearTimeout(forecastTimeout);
    };
  }, [sunCountdownTimeout, forecastTimeout]);

  const normalizeCondition = (cond: string) => {
    const lower = cond.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return 'rain';
    if (lower.includes('thunder') || lower.includes('storm')) return 'storm';
    if (lower.includes('cloud') || lower.includes('overcast') || lower.includes('cloudy')) return 'cloudy';
    if (lower.includes('partly')) return 'partly cloudy';
    if (lower.includes('clear') || lower.includes('sunny')) return 'clear';
    return lower;
  };

  const getNextDifferentCondition = (): { nextCondition: string; timeToChange: number; forecastTime: string } | null => {
    if (!weather?.hourlyForecast || weather.hourlyForecast.length === 0) {
      if (weather?.forecast && weather.forecast.timeToChange > 0) {
        const forecastDate = new Date(currentTime);
        forecastDate.setMinutes(forecastDate.getMinutes() + weather.forecast.timeToChange);
        const forecastTime = forecastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat === '12h' });
        return { nextCondition: weather.forecast.nextCondition, timeToChange: weather.forecast.timeToChange, forecastTime };
      }
      return null;
    }
    const currentCondition = weather.condition;
    const normalizedCurrent = normalizeCondition(currentCondition);
    for (const hourData of weather.hourlyForecast) {
      const normalizedForecast = normalizeCondition(hourData.condition);
      if (normalizedForecast !== normalizedCurrent) {
        let minutesUntil: number;
        if (hourData.time.includes('T') || hourData.time.includes(' ')) {
          const forecastDate = new Date(hourData.time.replace(' ', 'T'));
          minutesUntil = Math.round((forecastDate.getTime() - currentTime.getTime()) / (1000 * 60));
        } else {
          const hourTime = parseInt(hourData.time.split(':')[0]);
          const currentHour = currentTime.getHours();
          const currentMin = currentTime.getMinutes();
          minutesUntil = (hourTime * 60) - (currentHour * 60 + currentMin);
          if (minutesUntil <= 0) minutesUntil += 24 * 60;
        }
        if (minutesUntil <= 0) continue;
        const forecastDate = new Date(currentTime);
        forecastDate.setMinutes(forecastDate.getMinutes() + minutesUntil);
        const forecastTime = forecastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat === '12h' });
        return { nextCondition: hourData.condition, timeToChange: minutesUntil, forecastTime };
      }
    }
    return null;
  };

  const getWeatherDurationRow1 = (): string => {
    if (!weather?.condition) return '';
    return weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1).toLowerCase();
  };

  const getWeatherDurationRow2 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (!nextCondition || nextCondition.timeToChange <= 0) return 'All day';
    const hrs = Math.floor(nextCondition.timeToChange / 60);
    const mins = Math.floor(nextCondition.timeToChange % 60);
    if (hrs > 0 && mins > 0) return `For next ${hrs}h ${mins}m`;
    if (hrs > 0) return `For next ${hrs}h`;
    return `For next ${mins}m`;
  };

  const getUpcomingRow1 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (nextCondition) {
      const nextName = nextCondition.nextCondition.charAt(0).toUpperCase() + nextCondition.nextCondition.slice(1).toLowerCase();
      return `Expect: ${nextName}`;
    }
    return 'No change expected';
  };

  const getUpcomingRow2 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (nextCondition) return `Around ${nextCondition.forecastTime}`;
    return '';
  };

  const getSunCountdown = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const sunriseMinutes = parseTime(sunrise).hours * 60 + parseTime(sunrise).minutes;
    const sunsetMinutes = parseTime(sunset).hours * 60 + parseTime(sunset).minutes;
    if (isDay) {
      return { label: 'Sunset', countdown: formatCountdown(sunsetMinutes - now), time: formatSunTime(sunset) };
    } else {
      let minutesToSunrise = sunriseMinutes - now;
      if (minutesToSunrise < 0) minutesToSunrise += 24 * 60;
      return { label: 'Sunrise', countdown: formatCountdown(minutesToSunrise), time: formatSunTime(sunrise) };
    }
  };

  const formatSunTime = (time: string) => {
    const { hours, minutes } = parseTime(time);
    if (settings.timeFormat === '12h') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return time;
  };
  
  const formatTime = (date: Date) => {
    if (settings.timeFormat === '12h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${day}-${month}`;
  };

  const convertTemperature = (temp: number, unit: 'C' | 'F') => {
    if (unit === 'F') return Math.round((temp * 9/5) + 32);
    return Math.round(temp);
  };

  const handleDayDateClick = () => {
    if (showSunCountdown) {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      setShowSunCountdown(false);
      return;
    }
    setShowSunCountdown(true);
    const timeout = setTimeout(() => setShowSunCountdown(false), 5000);
    setSunCountdownTimeout(timeout);
  };

  const handleWeatherClick = () => {
    if (showForecast) {
      if (forecastTimeout) clearTimeout(forecastTimeout);
      setShowForecast(false);
      return;
    }
    setShowForecast(true);
    const timeout = setTimeout(() => setShowForecast(false), 5000);
    setForecastTimeout(timeout);
  };

  const sunData = getSunCountdown();
  const weatherDurationRow1 = getWeatherDurationRow1();
  const weatherDurationRow2 = getWeatherDurationRow2();
  const upcomingRow1 = getUpcomingRow1();
  const upcomingRow2 = getUpcomingRow2();

  // Menu items: 5 standard, 6 for admin
  const menuItems = [
    { icon: RefreshCw, label: 'Refresh', action: onForceRefresh },
    { icon: Download, label: 'Export', action: onExportSchedule },
    { icon: Bell, label: 'Notifications', action: onOpenNotifications },
    ...(isAdmin && onOpenAdmin ? [{ icon: Shield, label: 'Admin', action: onOpenAdmin }] : []),
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    { icon: isLoggedIn ? LogOut : LogIn, label: isLoggedIn ? 'Logout' : 'Login', action: onAuthAction },
  ];

  const menuIconCount = menuItems.length;
  // ~36px per icon (24px icon + 12px padding), plus container padding
  const expandedMenuWidth = menuIconCount * 36 + 16;

  // Close on outside click
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isMenuOpen]);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "py-1" : "py-3"
    )}>
      {/* Gradient blur fade background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
        }}
      />

      <div className="relative pl-3 pr-10">
        {/* Unison scaling wrapper: logo | center text | (menu icon area reserved) */}
        <div
          className={cn(
            "grid grid-cols-[auto_1fr] items-center gap-4 transition-transform duration-300 origin-top",
            isScrolled ? "scale-[0.85]" : "scale-100"
          )}
        >
          {/* Logo */}
          <div className="flex items-center pr-1">
            <img
              src={headerLogo}
              alt="ARRIVA.MV"
              className="w-auto h-8"
            />
          </div>

          {/* Centered stacked rows: Row 1 = Time | Date, Row 2 = Temp | Weather */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 pr-6">
            {/* Row 1: Time + Day/Date */}
            <div className="flex items-center justify-center gap-1.5 min-w-0 leading-none">
              <button
                onClick={toggleTimeFormat}
                className="hover:bg-white/5 rounded px-1 transition-colors"
              >
                <p className="font-bold text-white whitespace-nowrap adaptive-shadow leading-none text-[11px]">
                  {formatTime(currentTime)}
                </p>
              </button>
              <span className="text-white/40 text-[8px] leading-none">|</span>
              <button
                onClick={handleDayDateClick}
                className="hover:bg-white/5 rounded px-1 transition-colors text-center"
              >
                <p className="font-bold text-white whitespace-nowrap adaptive-shadow leading-none text-[9px]">
                  {showSunCountdown
                    ? `${sunData.label} in ${sunData.countdown} at ${sunData.time}`
                    : `${formatDay(currentTime)} · ${formatDate(currentTime)}`}
                </p>
              </button>
            </div>

            {/* Row 2: Temp + Current/Next Weather */}
            {weather && (
              <div className="flex items-center justify-center gap-1.5 min-w-0 mt-1 leading-none">
                <button
                  onClick={toggleTemperatureUnit}
                  className="hover:bg-white/5 rounded px-1 transition-colors"
                >
                  <p className="font-bold text-white whitespace-nowrap adaptive-shadow leading-none text-[11px]">
                    {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
                  </p>
                </button>
                <span className="text-white/40 text-[8px] leading-none">|</span>
                <button
                  onClick={handleWeatherClick}
                  className="hover:bg-white/5 rounded px-1 transition-colors text-center"
                >
                  <p className="font-bold text-white capitalize whitespace-nowrap truncate adaptive-shadow leading-none text-[9px] max-w-[160px]">
                    {showForecast
                      ? `${upcomingRow1}${upcomingRow2 ? ` ${upcomingRow2}` : ''}`
                      : `${weatherDurationRow1} · ${weatherDurationRow2}`}
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Corner Menu icon (RIGHT) — morphs into dropdown panel */}
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-2 right-2 z-50 transition-transform duration-300 origin-top-right",
            isScrolled ? "scale-[0.85]" : "scale-100"
          )}
        >
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className={cn(
              "relative p-1.5 rounded-full transition-all duration-300",
              isMenuOpen ? "menu-icon-glow scale-110" : "hover:bg-white/10"
            )}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            title="Menu"
          >
            <img
              src={UI_ICONS.menu}
              alt="Menu"
              className={cn("w-5 h-5 transition-all duration-300", isMenuOpen ? "opacity-100" : "opacity-80")}
              style={isMenuOpen ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' } : {}}
            />
            {notificationCount > 0 && !isMenuOpen && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-bold animate-pulse"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '0 3px',
                }}
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <div
            className={cn(
              "absolute right-0 mt-2 origin-top-right transition-all duration-300 ease-out overflow-hidden",
              isMenuOpen
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-90 pointer-events-none"
            )}
            style={{
              minWidth: '180px',
              background: 'rgba(20, 20, 28, 0.55)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <div className="py-1.5">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 text-left text-white/90 hover:bg-white/10 transition-colors"
                >
                  <item.icon className="w-4 h-4 opacity-85" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NewHeader;
