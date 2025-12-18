import { Moon, Sun, Cloud, CloudRain, CloudSnow, CloudSun } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface WeatherData {
  temp: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
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

const WeatherBar = ({ weather, currentTime }: Props) => {
  const { settings, toggleTimeFormat } = useSettings();
  const hours = currentTime.getHours();
  const isDay = hours >= 6 && hours < 18;
  
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
  };

  return (
    <div className="glass rounded-2xl p-4 mx-4 mb-4">
      <div className="flex items-center justify-between">
        {/* Time Section - Clickable to toggle format */}
        <button 
          onClick={toggleTimeFormat}
          className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors"
        >
          {isDay ? (
            <Sun className="w-6 h-6 text-foreground animate-pulse-soft" />
          ) : (
            <Moon className="w-6 h-6 text-foreground animate-pulse-soft" />
          )}
          <div className="text-left">
            <p 
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: settings.fontFamily }}
            >
              {formatTime(currentTime)}
            </p>
            <p className="text-[10px] text-muted-foreground tracking-wide">
              {formatDate(currentTime)}
            </p>
          </div>
        </button>

        {/* Weather Section */}
        {weather && (
          <div className="flex items-center gap-3 text-right">
            <div>
              <p 
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: settings.fontFamily }}
              >
                {Math.round(weather.temp)}°C
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {weather.condition}
              </p>
            </div>
            <div className="text-muted-foreground">
              {getWeatherIcon(weather.condition, isDay)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBar;
