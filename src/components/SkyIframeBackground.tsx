import { useEffect, useRef, useState, useMemo } from 'react';

interface WeatherData {
  weather?: {
    condition: string;
    windSpeed: number;
    windDirection: number;
    cloudCoverage: number;
  };
  rain?: {
    active: boolean;
    intensity: number;
  };
}

interface Props {
  weatherData: WeatherData | null;
}

// Calculate CSS filters based on weather conditions
const getWeatherFilters = (weatherData: WeatherData | null) => {
  if (!weatherData?.weather) {
    return { filter: 'none', brightness: 1, contrast: 1, saturation: 1 };
  }

  const condition = weatherData.weather.condition?.toLowerCase() || 'clear';
  const cloudCoverage = weatherData.weather.cloudCoverage || 0;
  const rainActive = weatherData.rain?.active || condition.includes('rain');
  const rainIntensity = weatherData.rain?.intensity || 0;

  let brightness = 1;
  let contrast = 1;
  let saturation = 1;

  // Adjust based on weather
  if (condition.includes('storm') || condition.includes('thunder')) {
    brightness = 0.6;
    contrast = 1.2;
    saturation = 0.7;
  } else if (condition.includes('rain') || rainActive) {
    brightness = 0.75 - rainIntensity * 0.15;
    contrast = 1.1;
    saturation = 0.8;
  } else if (condition.includes('overcast') || cloudCoverage > 0.7) {
    brightness = 0.85;
    contrast = 1.05;
    saturation = 0.85;
  } else if (condition.includes('cloud') || cloudCoverage > 0.3) {
    brightness = 0.92;
    saturation = 0.95;
  } else if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
    brightness = 0.9;
    contrast = 0.9;
    saturation = 0.75;
  }

  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  
  return { filter, brightness, contrast, saturation };
};

const SkyIframeBackground = ({ weatherData }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const weatherFilters = useMemo(() => getWeatherFilters(weatherData), [weatherData]);

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Iframe with weather filters */}
      <iframe
        ref={iframeRef}
        src="/live-skyview.html"
        className="w-full h-full border-none"
        style={{
          filter: weatherFilters.filter,
          transition: 'filter 2s ease-in-out',
          transform: 'scale(1.02)', // Slight scale to hide edges
          transformOrigin: 'center',
        }}
        onLoad={() => setIsLoaded(true)}
        title="Live Sky Background"
        sandbox="allow-scripts allow-same-origin"
      />
      
      {/* Fade in overlay during loading */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isLoaded ? 0 : 1 }}
      />
    </div>
  );
};

export default SkyIframeBackground;
