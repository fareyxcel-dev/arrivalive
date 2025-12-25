import { useState, useEffect } from 'react';
import { Moon, Sun, Cloud, CloudRain, CloudSnow, CloudSun, Sunrise, Sunset } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface WeatherData {
  temp: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: {
    nextCondition: string;
    timeToChange: number; // minutes
  };
  chanceOfRain?: number;
}

interface Props {
  weather: WeatherData | null;
  currentTime: Date;
}

const getWeatherIcon = (condition: string, isDay: boolean) => {
  const iconClass = "w-5 h-5";
  
  switch (condition.toLowerCase()) {
    case 'clear':
      return isDay ? <Sun className={iconClass} /> : <Moon className={iconClass} />;
    case 'clouds':
    case 'haze':
    case 'mist':
    case 'fog':
      return isDay ? <CloudSun className={iconClass} /> : <Cloud className={iconClass} />;
    case 'rain':
    case 'drizzle':
    case 'thunderstorm':
      return <CloudRain className={iconClass} />;
    case 'snow':
      return <CloudSnow className={iconClass} />;
    default:
      return isDay ? <Sun className={iconClass} /> : <Moon className={iconClass} />;
  }
};

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

const WeatherBar = ({ weather, currentTime }: Props) => {
  const { settings, toggleTimeFormat, toggleTemperatureUnit } = useSettings();
  const [showSunCountdown, setShowSunCountdown] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [sunCountdownTimeout, setSunCountdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [forecastTimeout, setForecastTimeout] = useState<NodeJS.Timeout | null>(null);

  const hours = currentTime.getHours();
  const isDay = hours >= 6 && hours < 18;
  
  const sunrise = weather?.sunrise || DEFAULT_SUNRISE;
  const sunset = weather?.sunset || DEFAULT_SUNSET;

  // Calculate sunrise/sunset countdown
  const getSunCountdown = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const sunriseMinutes = parseTime(sunrise).hours * 60 + parseTime(sunrise).minutes;
    const sunsetMinutes = parseTime(sunset).hours * 60 + parseTime(sunset).minutes;
    
    if (isDay) {
      // Show countdown to sunset
      const minutesToSunset = sunsetMinutes - now;
      return { 
        label: 'Sunset', 
        countdown: formatCountdown(minutesToSunset),
        time: sunset,
        icon: <Sunset className="w-4 h-4" />
      };
    } else {
      // Show countdown to sunrise
      let minutesToSunrise = sunriseMinutes - now;
      if (minutesToSunrise < 0) minutesToSunrise += 24 * 60; // Next day
      return { 
        label: 'Sunrise', 
        countdown: formatCountdown(minutesToSunrise),
        time: sunrise,
        icon: <Sunrise className="w-4 h-4" />
      };
    }
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

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const convertTemperature = (temp: number, unit: 'C' | 'F') => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  };

  const handleDayDateClick = () => {
    if (showSunCountdown) {
      // Reset if already showing
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      setShowSunCountdown(false);
      return;
    }
    
    setShowSunCountdown(true);
    const timeout = setTimeout(() => {
      setShowSunCountdown(false);
    }, 30000); // 30 seconds
    setSunCountdownTimeout(timeout);
  };

  const handleWeatherClick = () => {
    if (showForecast) {
      if (forecastTimeout) clearTimeout(forecastTimeout);
      setShowForecast(false);
      return;
    }
    
    setShowForecast(true);
    const timeout = setTimeout(() => {
      setShowForecast(false);
    }, 30000);
    setForecastTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      if (forecastTimeout) clearTimeout(forecastTimeout);
    };
  }, [sunCountdownTimeout, forecastTimeout]);

  const sunData = getSunCountdown();

  return (
    <div className="glass rounded-2xl p-4 mx-4 mb-4">
      <div className="flex items-start justify-between">
        {/* Time Section - Left */}
        <div className="flex items-start gap-3">
          {/* Sun/Moon Icon */}
          <div className="pt-1">
            {isDay ? (
              <Sun className="w-6 h-6 text-foreground animate-pulse-soft" />
            ) : (
              <Moon className="w-6 h-6 text-foreground animate-pulse-soft" />
            )}
          </div>
          
          <div className="space-y-0.5">
            {/* Row 1: Live Time - Clickable to toggle format */}
            <button 
              onClick={toggleTimeFormat}
              className="block hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
            >
              <p className="text-xl font-bold text-foreground">
                {formatTime(currentTime)}
              </p>
            </button>
            
            {/* Row 2 & 3: Day and Date - Clickable for sun countdown */}
            <button
              onClick={handleDayDateClick}
              className={cn(
                "block text-left hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300",
                showSunCountdown && "blur-sm opacity-0"
              )}
            >
              <p className="text-sm font-semibold text-foreground/90">
                {formatDay(currentTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(currentTime)}
              </p>
            </button>

            {/* Sun countdown overlay */}
            {showSunCountdown && (
              <button
                onClick={handleDayDateClick}
                className="absolute animate-fade-in text-left px-1 -mx-1"
                style={{ marginTop: '-2.25rem' }}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/90">
                  {sunData.icon}
                  <span>in {sunData.countdown}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sunData.label} at {sunData.time}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Weather Section - Right */}
        {weather && (
          <div className="flex items-start gap-3">
            <div className="text-right space-y-0.5">
              {/* Row 1: Temperature - Clickable to toggle unit */}
              <button
                onClick={toggleTemperatureUnit}
                className="block ml-auto hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
              >
                <p className="text-xl font-bold text-foreground">
                  {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
                </p>
              </button>
              
              {/* Row 2 & 3: Condition and chance - Clickable for forecast */}
              <button
                onClick={handleWeatherClick}
                className={cn(
                  "block text-right hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300",
                  showForecast && "blur-sm opacity-0"
                )}
              >
                <p className="text-sm font-semibold text-foreground/90 capitalize">
                  {weather.condition}
                </p>
                <p className="text-xs text-muted-foreground">
                  {weather.chanceOfRain !== undefined 
                    ? `${weather.chanceOfRain}% chance of rain`
                    : `Humidity ${weather.humidity || 75}%`
                  }
                </p>
              </button>

              {/* Forecast overlay */}
              {showForecast && (
                <button
                  onClick={handleWeatherClick}
                  className="absolute animate-fade-in text-right px-1 -mx-1"
                  style={{ marginTop: '-2.25rem', right: '1.5rem' }}
                >
                  <p className="text-sm font-semibold text-foreground/90">
                    {weather.forecast?.nextCondition 
                      ? `${weather.forecast.nextCondition} in ${formatCountdown(weather.forecast.timeToChange)}`
                      : 'No change expected'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Weather forecast
                  </p>
                </button>
              )}
            </div>

            {/* Weather Icon */}
            <div className="text-muted-foreground pt-1">
              {getWeatherIcon(weather.condition, isDay)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBar;
