import { useState, useEffect } from 'react';
import { Moon, Sun, Cloud, CloudRain, CloudSnow, CloudSun, Sunrise, Sunset, CloudLightning, CloudDrizzle, Cloudy } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface HourlyForecast {
  time: string;
  condition: string;
  temp: number;
}

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
  hourlyForecast?: HourlyForecast[];
  weatherDuration?: number; // minutes until weather changes
}

interface Props {
  weather: WeatherData | null;
  currentTime: Date;
}

const getWeatherIcon = (condition: string, isDay: boolean) => {
  const iconClass = "w-5 h-5";
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
    return <CloudLightning className={iconClass} />;
  }
  if (lowerCondition.includes('drizzle')) {
    return <CloudDrizzle className={iconClass} />;
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) {
    return <CloudRain className={iconClass} />;
  }
  if (lowerCondition.includes('snow')) {
    return <CloudSnow className={iconClass} />;
  }
  if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) {
    return <Cloudy className={iconClass} />;
  }
  if (lowerCondition.includes('partly') || lowerCondition.includes('cloud') || lowerCondition.includes('haze') || lowerCondition.includes('mist') || lowerCondition.includes('fog')) {
    return isDay ? <CloudSun className={iconClass} /> : <Cloud className={iconClass} />;
  }
  // Clear/sunny
  return isDay ? <Sun className={iconClass} /> : <Moon className={iconClass} />;
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
        // Parse ISO time from forecast
        let minutesUntil: number;
        if (hourData.time.includes('T')) {
          const forecastDate = new Date(hourData.time);
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
  
  // Calculate weather duration (time until change) - show as "Clear for 2h 15m"
  const getWeatherDuration = (): string => {
    const nextCondition = getNextDifferentCondition();
    if (!nextCondition || nextCondition.timeToChange <= 0) return '';
    
    const hrs = Math.floor(nextCondition.timeToChange / 60);
    const mins = Math.floor(nextCondition.timeToChange % 60);
    
    // Capitalize first letter of current condition
    const conditionName = weather?.condition 
      ? weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1).toLowerCase()
      : 'Weather';
    
    if (hrs > 0 && mins > 0) {
      return `${conditionName} for ${hrs}h ${mins}m`;
    } else if (hrs > 0) {
      return `${conditionName} for ${hrs}h`;
    }
    return `${conditionName} for ${mins}m`;
  };

  // Calculate sunrise/sunset countdown with expected time
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
        icon: <Sunset className="w-4 h-4" />
      };
    } else {
      let minutesToSunrise = sunriseMinutes - now;
      if (minutesToSunrise < 0) minutesToSunrise += 24 * 60;
      return { 
        label: 'Sunrise', 
        countdown: formatCountdown(minutesToSunrise),
        time: formatSunTime(sunrise),
        icon: <Sunrise className="w-4 h-4" />
      };
    }
  };

  // Format sun time based on user preference
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

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
    });
  };

  // Format date as dd-Mmmm
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

  // Get chance of rain text
  const getChanceOfWeather = (): string => {
    if (!weather) return '';
    const chanceOfRain = weather.chanceOfRain || 0;
    if (chanceOfRain > 0) {
      return `${chanceOfRain}% chance of rain`;
    }
    return 'No rain expected';
  };

  const handleDayDateClick = () => {
    if (showSunCountdown) {
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
    }, 30000); // 30 seconds
    setForecastTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      if (forecastTimeout) clearTimeout(forecastTimeout);
    };
  }, [sunCountdownTimeout, forecastTimeout]);

  const sunData = getSunCountdown();
  const nextCondition = getNextDifferentCondition();
  const weatherDurationText = getWeatherDuration();
  const chanceOfWeatherText = getChanceOfWeather();

  return (
    <div className="glass rounded-2xl p-4 mx-4 mb-4">
      <div className="flex items-start justify-between">
        {/* Time Section - Left (3 rows) */}
        <div className="space-y-0.5">
          {/* Row 1: Icon + Live Time on same row (clickable for format toggle) */}
          <button 
            onClick={toggleTimeFormat}
            className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
          >
            <div className={cn(
              "transition-all duration-300",
              showSunCountdown && "opacity-0"
            )}>
              {isDay ? (
                <Sun className="w-5 h-5 text-white animate-pulse-soft" />
              ) : (
                <Moon className="w-5 h-5 text-white animate-pulse-soft" />
              )}
            </div>
            {showSunCountdown && (
              <div className="absolute animate-fade-in text-white">
                {sunData.icon}
              </div>
            )}
            <p className="text-xl font-bold text-white">
              {formatTime(currentTime)}
            </p>
          </button>
          
          {/* Row 2 & 3: Day and Date - clickable for sun countdown */}
          <div className="relative">
            <button
              onClick={handleDayDateClick}
              className={cn(
                "block text-left hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300",
                showSunCountdown && "blur-sm opacity-0"
              )}
            >
              {/* Row 2: Day (larger font) */}
              <p className="text-sm font-bold text-white">
                {formatDay(currentTime)}
              </p>
              {/* Row 3: Date (dd-Mmmm) */}
              <p className="text-xs font-medium text-white/70">
                {formatDate(currentTime)}
              </p>
            </button>

            {/* Sun countdown overlay */}
            {showSunCountdown && (
              <button
                onClick={handleDayDateClick}
                className="absolute top-0 left-0 animate-fade-in text-left px-1 -mx-1"
              >
                <p className="text-sm font-bold text-white">
                  {sunData.label} in {sunData.countdown}
                </p>
                <p className="text-xs font-medium text-white/70">
                  at {sunData.time}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Weather Section - Right (3 rows) */}
        {weather && (
          <div className="text-right space-y-0.5">
            {/* Row 1: Temperature + Weather Icon (clickable for unit toggle) */}
            <button
              onClick={toggleTemperatureUnit}
              className="flex items-center justify-end gap-2 ml-auto hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
            >
              <p className="text-xl font-bold text-white">
                {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
              </p>
              <div className={cn(
                "text-white transition-all duration-300",
                showForecast && "opacity-0"
              )}>
                {getWeatherIcon(weather.condition, isDay)}
              </div>
              {showForecast && nextCondition && (
                <div className="absolute animate-fade-in text-white" style={{ right: '1rem' }}>
                  {getWeatherIcon(nextCondition.nextCondition, isDay)}
                </div>
              )}
            </button>
            
            {/* Row 2 & 3: Weather condition + duration + chance */}
            <div className="relative">
              <button
                onClick={handleWeatherClick}
                className={cn(
                  "block text-right hover:bg-white/5 rounded px-1 -mx-1 transition-all duration-300",
                  showForecast && "blur-sm opacity-0"
                )}
              >
                {/* Row 2: Current weather + duration (larger font) */}
                <p className="text-sm font-bold text-white capitalize">
                  {weatherDurationText || weather.condition}
                </p>
                {/* Row 3: Chance of weather */}
                <p className="text-xs font-medium text-white/70">
                  {chanceOfWeatherText}
                </p>
              </button>

              {/* Forecast overlay - shows next DIFFERENT condition */}
              {showForecast && (
                <button
                  onClick={handleWeatherClick}
                  className="absolute top-0 right-0 animate-fade-in text-right px-1 -mx-1"
                >
                  {nextCondition ? (
                    <>
                      <p className="text-sm font-bold text-white capitalize">
                        {nextCondition.nextCondition} in {formatCountdown(nextCondition.timeToChange)}
                      </p>
                      <p className="text-xs font-medium text-white/70">
                        at {nextCondition.forecastTime}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-white">
                      No change expected
                    </p>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBar;