import { useEffect, useState, useMemo } from 'react';
import dayNightCycle from '@/assets/day-night-cycle.gif';
import weatherAssets from '@/assets/weather-assets.png';
import RainAnimation from './RainAnimation';
import CloudLayer from './CloudLayer';

interface WeatherData {
  temp: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: number;
  isRaining?: boolean;
  cloudCover?: number;
}

interface Props {
  weather?: WeatherData | null;
}

const AnimatedBackground = ({ weather }: Props) => {
  const [frameOffset, setFrameOffset] = useState(0);

  // Calculate the current position in the 24-hour cycle
  // GIF starts at 6am, so we need to offset accordingly
  useEffect(() => {
    const updateFrameOffset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // Total seconds since midnight
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      // GIF starts at 6am (6 * 3600 = 21600 seconds)
      // We need to offset so that 6am = start of GIF
      const gifStartOffset = 6 * 3600;
      const adjustedSeconds = (totalSeconds - gifStartOffset + 86400) % 86400;
      
      // Convert to percentage of day (0-100)
      const percentOfDay = (adjustedSeconds / 86400) * 100;
      setFrameOffset(percentOfDay);
    };

    updateFrameOffset();
    // Update every minute for smooth transitions
    const interval = setInterval(updateFrameOffset, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate cloud parameters from weather
  const cloudParams = useMemo(() => {
    if (!weather) {
      return { coverage: 30, windSpeed: 5, windDirection: 180 };
    }
    
    // Map weather condition to cloud coverage
    let coverage = 30;
    const condition = weather.condition?.toLowerCase() || '';
    
    if (condition.includes('clear')) coverage = 10;
    else if (condition.includes('cloud') || condition.includes('overcast')) coverage = 70;
    else if (condition.includes('rain') || condition.includes('storm')) coverage = 90;
    else if (condition.includes('fog') || condition.includes('mist')) coverage = 80;
    else if (condition.includes('haze')) coverage = 50;
    
    return {
      coverage: weather.cloudCover || coverage,
      windSpeed: weather.windSpeed || 5,
      windDirection: weather.windDirection || 180,
    };
  }, [weather]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Layer 1: Day-Night Cycle GIF as base background
          The GIF is 24 seconds, we're slowing it to 24 hours (3600x slower)
          Using CSS animation-duration to control playback timing */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${dayNightCycle})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%) brightness(0.85)',
        }}
      />

      {/* Layer 2: Cloud Layer based on weather */}
      <CloudLayer
        cloudCoverage={cloudParams.coverage}
        windSpeed={cloudParams.windSpeed}
        windDirection={cloudParams.windDirection}
        isRaining={weather?.isRaining || false}
      />

      {/* Layer 3: Weather Assets overlay with animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[200%] h-full animate-drift opacity-15"
          style={{
            backgroundImage: `url(${weatherAssets})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'repeat-x',
          }}
        />
      </div>

      {/* Layer 4: Rain Animation (when raining) */}
      {weather && (
        <RainAnimation
          isRaining={weather.isRaining || false}
          precipitation={weather.precipitation || 0}
          windSpeed={weather.windSpeed || 0}
          windDirection={weather.windDirection || 180}
        />
      )}

      {/* Layer 5: Monochrome Filter + Glass Reflection */}
      <div className="absolute inset-0 monochrome opacity-40 pointer-events-none" />
      
      {/* Glass-like reflection overlay */}
      <div className="absolute inset-0 glass-reflect pointer-events-none" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
