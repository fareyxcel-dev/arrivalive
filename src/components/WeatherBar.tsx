import { Moon, Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
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
      return <Cloud className={iconClass} />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className={iconClass} />;
    case 'snow':
      return <CloudSnow className={iconClass} />;
    default:
      return isDay ? <Sun className={iconClass} /> : <Moon className={iconClass} />;
  }
};

const WeatherBar = ({ weather, currentTime }: Props) => {
  const hours = currentTime.getHours();
  const isDay = hours >= 6 && hours < 18;
  
  const formatTime = (date: Date) => {
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
        {/* Time Section */}
        <div className="flex items-center gap-3">
          {isDay ? (
            <Sun className="w-6 h-6 text-primary animate-pulse-soft" />
          ) : (
            <Moon className="w-6 h-6 text-accent animate-pulse-soft" />
          )}
          <div>
            <p className="font-display text-xl font-bold text-foreground">
              {formatTime(currentTime)}
            </p>
            <p className="text-[10px] text-muted-foreground tracking-wide">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        {/* Weather Section */}
        {weather && (
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="font-display text-xl font-bold text-foreground">
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
