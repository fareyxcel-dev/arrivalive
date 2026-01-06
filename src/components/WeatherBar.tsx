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

  // Calculate sunrise/sunset countdown
  const getSunCountdown = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const sunriseMinutes = parseTime(sunrise).hours * 60 + parseTime(sunrise).minutes;
    const sunsetMinutes = parseTime(sunset).hours * 60 + parseTime(sunset).minutes;
    
    if (isDay) {
      const minutesToSunset = sunsetMinutes - now;
      return { 
        label: 'Sunset', 
        countdown: formatCountdown(minutesToSunset),
        time: sunset,
        icon: <Sunset className="w-4 h-4" />
      };
    } else {
      let minutesToSunrise = sunriseMinutes - now;
      if (minutesToSunrise < 0) minutesToSunrise += 24 * 60;
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

  // Full month name instead of abbreviated
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
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
      if (sunCountdownTimeout) clearTimeout(sunCountdownTimeout);
      setShowSunCountdown(false);
      return;
    }
    
    setShowSunCountdown(true);
    const timeout = setTimeout(() => {
      setShowSunCountdown(false);
    }, 30000);
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
  const nextCondition = getNextDifferentCondition();
  const weatherDurationText = getWeatherDuration();

  return (
    <div className="glass rounded-2xl p-4 mx-4 mb-4">
      <div className="flex items-start justify-between">
        {/* Time Section - Left */}
        <div className="flex items-start gap-3">
          <div className="space-y-0.5">
            {/* Row 1: Live Time + Sun/Moon Icon */}
            <button 
              onClick={toggleTimeFormat}
              className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
            >
              <p className="text-xl font-bold text-foreground">
                {formatTime(currentTime)}
              </p>
              <div className={cn(
                "transition-all duration-300",
                showSunCountdown && "blur-sm opacity-0"
              )}>
                {isDay ? (
                  <Sun className="w-5 h-5 text-foreground animate-pulse-soft" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground animate-pulse-soft" />
                )}
              </div>
              {showSunCountdown && (
                <div className="absolute ml-[4.5rem] animate-fade-in text-foreground">
                  {sunData.icon}
                </div>
              )}
            </button>
            
            {/* Row 2 & 3: Day and Date - Full month name */}
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
                <p className="text-sm font-semibold text-foreground/90">
                  {sunData.label} at {sunData.time}
                </p>
                <p className="text-xs text-muted-foreground">
                  in {sunData.countdown}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Weather Section - Right */}
        {weather && (
          <div className="flex items-start gap-3">
            <div className="text-right space-y-0.5">
              {/* Row 1: Weather Icon + Temperature */}
              <button
                onClick={toggleTemperatureUnit}
                className="flex items-center justify-end gap-2 ml-auto hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
              >
                <div className={cn(
                  "text-foreground transition-all duration-300",
                  showForecast && "blur-sm opacity-0"
                )}>
                  {getWeatherIcon(weather.condition, isDay)}
                </div>
                {showForecast && nextCondition && (
                  <div className="absolute mr-[4rem] animate-fade-in text-foreground">
                    {getWeatherIcon(nextCondition.nextCondition, isDay)}
                  </div>
                )}
                <p className="text-xl font-bold text-foreground">
                  {convertTemperature(weather.temp, settings.temperatureUnit)}°{settings.temperatureUnit}
                </p>
              </button>
              
              {/* Row 2 & 3: Condition and weather duration */}
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
                {weatherDurationText && (
                  <p className="text-xs text-muted-foreground">
                    {weatherDurationText}
                  </p>
                )}
              </button>

              {/* Forecast overlay - shows next DIFFERENT condition */}
              {showForecast && (
                <button
                  onClick={handleWeatherClick}
                  className="absolute animate-fade-in text-right px-1 -mx-1"
                  style={{ marginTop: '-2.25rem', right: '1.5rem' }}
                >
                  {nextCondition ? (
                    <>
                      <p className="text-sm font-semibold text-foreground/90 capitalize">
                        {nextCondition.nextCondition} at {nextCondition.forecastTime}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        in {formatCountdown(nextCondition.timeToChange)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-foreground/90">
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