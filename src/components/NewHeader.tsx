import { useState, useEffect } from 'react';
import { RefreshCw, Download, Settings, LogIn, LogOut, FileText, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/header-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';

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

// Default sun times for Maldives
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
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const NewHeader = ({
  onForceRefresh,
  onExportSchedule,
  onOpenSettings,
  isLoggedIn,
  onAuthAction,
  onInstallPWA,
  userEmail,
  onAdminExport,
  onOpenNotifications,
  onOpenAdmin,
  notificationCount = 0,
  weather,
  currentTime,
}: Props) => {
  const { settings, toggleTimeFormat, toggleTemperatureUnit } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSunCountdown, setShowSunCountdown] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [sunCountdownTimeout, setSunCountdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [forecastTimeout, setForecastTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Track scroll for shrinking header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      if (forecastTimeout) clearTimeout(forecastTimeout);
    };
  }, [sunCountdownTimeout, forecastTimeout]);

  // Normalize condition for comparison
  const normalizeCondition = (cond: string) => {
    const lower = cond.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return 'rain';
    if (lower.includes('thunder') || lower.includes('storm')) return 'storm';
    if (lower.includes('cloud') || lower.includes('overcast') || lower.includes('cloudy')) return 'cloudy';
    if (lower.includes('partly')) return 'partly cloudy';
    if (lower.includes('clear') || lower.includes('sunny')) return 'clear';
    return lower;
  };

  // Find next different weather condition from hourly forecast
  const getNextDifferentCondition = (): { nextCondition: string; timeToChange: number; forecastTime: string } | null => {
    if (!weather?.hourlyForecast || weather.hourlyForecast.length === 0) {
      if (weather?.forecast && weather.forecast.timeToChange > 0) {
        const forecastDate = new Date(currentTime);
        forecastDate.setMinutes(forecastDate.getMinutes() + weather.forecast.timeToChange);
        const forecastTime = forecastDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: settings.timeFormat === '12h' 
        });
        return { 
          nextCondition: weather.forecast.nextCondition, 
          timeToChange: weather.forecast.timeToChange, 
          forecastTime 
        };
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
        const forecastTime = forecastDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: settings.timeFormat === '12h' 
        });
        
        return {
          nextCondition: hourData.condition,
          timeToChange: minutesUntil,
          forecastTime,
        };
      }
    }
    
    return null;
  };

  // Weather duration text - Row 1: Condition name, Row 2: Duration
  const getWeatherDurationRow1 = (): string => {
    if (!weather?.condition) return '';
    return weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1).toLowerCase();
  };

  const getWeatherDurationRow2 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (!nextCondition || nextCondition.timeToChange <= 0) {
      return 'All day';
    }
    const hrs = Math.floor(nextCondition.timeToChange / 60);
    const mins = Math.floor(nextCondition.timeToChange % 60);
    if (hrs > 0 && mins > 0) return `For next ${hrs}h ${mins}m`;
    if (hrs > 0) return `For next ${hrs}h`;
    return `For next ${mins}m`;
  };

  // Upcoming weather - Row 1: "Expect: {Condition}", Row 2: "Around {time}"
  const getUpcomingRow1 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (nextCondition) {
      const nextName = nextCondition.nextCondition.charAt(0).toUpperCase() + 
                       nextCondition.nextCondition.slice(1).toLowerCase();
      return `Expect: ${nextName}`;
    }
    return 'No change expected';
  };

  const getUpcomingRow2 = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (nextCondition) {
      return `Around ${nextCondition.forecastTime}`;
    }
    return '';
  };

  // Sun countdown
  const getSunCountdown = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const sunriseMinutes = parseTime(sunrise).hours * 60 + parseTime(sunrise).minutes;
    const sunsetMinutes = parseTime(sunset).hours * 60 + parseTime(sunset).minutes;
    
    if (isDay) {
      const minutesToSunset = sunsetMinutes - now;
      return { 
        label: 'Sunset', 
        countdown: formatCountdown(minutesToSunset),
        time: formatSunTime(sunset),
      };
    } else {
      let minutesToSunrise = sunriseMinutes - now;
      if (minutesToSunrise < 0) minutesToSunrise += 24 * 60;
      return { 
        label: 'Sunrise', 
        countdown: formatCountdown(minutesToSunrise),
        time: formatSunTime(sunrise),
      };
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
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${day}-${month}`;
  };

  const convertTemperature = (temp: number, unit: 'C' | 'F') => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  };

  const handleDayDateClick = () => {
    if (showSunCountdown) {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      setShowSunCountdown(false);
      return;
    }
    setShowSunCountdown(true);
    const timeout = setTimeout(() => setShowSunCountdown(false), 30000);
    setSunCountdownTimeout(timeout);
  };

  const handleWeatherClick = () => {
    if (showForecast) {
      if (forecastTimeout) clearTimeout(forecastTimeout);
      setShowForecast(false);
      return;
    }
    setShowForecast(true);
    const timeout = setTimeout(() => setShowForecast(false), 30000);
    setForecastTimeout(timeout);
  };

  const sunData = getSunCountdown();
  const nextCondition = getNextDifferentCondition();
  const weatherDurationRow1 = getWeatherDurationRow1();
  const weatherDurationRow2 = getWeatherDurationRow2();
  const upcomingRow1 = getUpcomingRow1();
  const upcomingRow2 = getUpcomingRow2();

  const menuItems = [
    { icon: RefreshCw, label: 'Force Refresh', action: onForceRefresh },
    { icon: Download, label: 'Export Schedule', action: onExportSchedule },
    { icon: Bell, label: 'Notifications', action: onOpenNotifications },
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    ...(isAdmin && onAdminExport ? [{ icon: FileText, label: 'Export Build Data', action: onAdminExport }] : []),
    ...(isAdmin && onOpenAdmin ? [{ icon: Shield, label: 'Admin Dashboard', action: onOpenAdmin }] : []),
    { icon: isLoggedIn ? LogOut : LogIn, label: isLoggedIn ? 'Logout' : 'Login', action: onAuthAction },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "py-2" : "py-3"
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

      <div className="relative px-4">
        {/* Main header row */}
        <div className="flex items-start justify-between">
          {/* Left: Time & Date */}
          <div className={cn(
            "space-y-0 transition-all duration-300",
            isScrolled ? "scale-[0.85] origin-top-left" : ""
          )}>
            <button 
              onClick={toggleTimeFormat}
              className="flex items-center gap-1 hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
            >
              <p className={cn(
                "font-bold text-white transition-all whitespace-nowrap",
                isScrolled ? "text-base" : "text-lg"
              )}>
                {formatTime(currentTime)}
              </p>
            </button>
            
            <div className="relative">
              <button
                onClick={handleDayDateClick}
                className={cn(
                  "block text-left hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300 whitespace-nowrap",
                  showSunCountdown && "blur-sm opacity-0"
                )}
              >
                <p className={cn(
                  "font-bold text-white transition-all whitespace-nowrap",
                  isScrolled ? "text-[10px]" : "text-xs"
                )}>
                  {formatDay(currentTime)}
                </p>
                <p className={cn(
                  "font-medium text-white/70 transition-all whitespace-nowrap",
                  isScrolled ? "text-[9px]" : "text-[10px]"
                )}>
                  {formatDate(currentTime)}
                </p>
              </button>

              {showSunCountdown && (
                <button
                  onClick={handleDayDateClick}
                  className="absolute top-0 left-0 animate-fade-in text-left px-1 -mx-1 whitespace-nowrap"
                >
                  <p className={cn("font-bold text-white whitespace-nowrap", isScrolled ? "text-[10px]" : "text-xs")}>
                    {sunData.label} in {sunData.countdown}
                  </p>
                  <p className={cn("font-medium text-white/70 whitespace-nowrap", isScrolled ? "text-[9px]" : "text-[10px]")}>
                    at {sunData.time}
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Center: Logo */}
          <div className={cn(
            "flex flex-col items-center transition-all duration-300",
            isScrolled ? "scale-[0.7] -my-2" : ""
          )}>
            <button
              onClick={onInstallPWA}
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <img 
                src={headerLogo} 
                alt="ARRIVA.MV" 
                className={cn(
                  "w-auto transition-all duration-300",
                  isScrolled ? "h-10" : "h-12"
                )} 
              />
            </button>
            
            {/* Menu chevron under logo */}
            <div className="relative mt-1.5">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center justify-center transition-all duration-300",
                  isMenuOpen
                    ? "w-72 h-9 gap-3 px-4 rounded-full"
                    : "w-10 h-6 px-2 rounded-full",
                  "glass border border-white/15"
                )}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? (
                  <>
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          item.action?.();
                          setIsMenuOpen(false);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                        title={item.label}
                      >
                        <item.icon className="w-4 h-4 text-white/80" />
                      </button>
                    ))}
                  </>
                ) : null}
              </button>
              
              {/* Notification badge */}
              {notificationCount > 0 && !isMenuOpen && (
                <div 
                  className="absolute -top-1 -right-0 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold animate-pulse"
                  style={{
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </div>
              )}
            </div>
          </div>

          {/* Right: Weather */}
          {weather && (
            <div className={cn(
              "text-right space-y-0 transition-all duration-300",
              isScrolled ? "scale-[0.85] origin-top-right" : ""
            )}>
              <button
                onClick={toggleTemperatureUnit}
                className="flex items-center justify-end gap-1 ml-auto hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
              >
                <p className={cn(
                "font-bold text-white transition-all whitespace-nowrap",
                isScrolled ? "text-base" : "text-lg"
                )}>
                  {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
                </p>
              </button>
              
              <div className="relative">
                <button
                  onClick={handleWeatherClick}
                  className={cn(
                    "block text-right hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300 whitespace-nowrap",
                    showForecast && "blur-sm opacity-0"
                  )}
                >
                  <p className={cn(
                    "font-bold text-white capitalize transition-all whitespace-nowrap",
                    isScrolled ? "text-[10px]" : "text-xs"
                  )}>
                    {weatherDurationRow1}
                  </p>
                  <p className={cn(
                    "font-medium text-white/70 transition-all whitespace-nowrap",
                    isScrolled ? "text-[9px]" : "text-[10px]"
                  )}>
                    {weatherDurationRow2}
                  </p>
                </button>

                {showForecast && (
                  <button
                    onClick={handleWeatherClick}
                    className="absolute top-0 right-0 animate-fade-in text-right px-1 -mx-1 whitespace-nowrap"
                  >
                    <p className={cn("font-bold text-white capitalize whitespace-nowrap", isScrolled ? "text-[10px]" : "text-xs")}>
                      {upcomingRow1}
                    </p>
                    {upcomingRow2 && (
                      <p className={cn("font-medium text-white/70 whitespace-nowrap", isScrolled ? "text-[9px]" : "text-[10px]")}>
                        {upcomingRow2}
                      </p>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu items now inside the pill, no separate dropdown */}
    </header>
  );
};

export default NewHeader;
