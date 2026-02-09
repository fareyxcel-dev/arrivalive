import { useRef, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

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

const SkyIframeBackground = ({ weatherData }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { settings } = useSettings();

  // Calculate filter based on all settings sliders
  const getIframeFilter = () => {
    const filters: string[] = [];
    
    // Brightness
    if (settings.iframeBrightness !== 100) {
      filters.push(`brightness(${settings.iframeBrightness}%)`);
    }
    
    // Saturation (0=grayscale, 100=normal, 200=oversaturated)
    if (settings.saturation !== 100) {
      filters.push(`saturate(${settings.saturation}%)`);
    }
    
    // Contrast
    if (settings.contrast !== 100) {
      filters.push(`contrast(${settings.contrast}%)`);
    }
    
    // Shadows (simulated via brightness adjustment)
    if (settings.shadows !== 50) {
      const shadowBrightness = 0.7 + (settings.shadows / 100) * 0.6;
      filters.push(`brightness(${shadowBrightness.toFixed(2)})`);
    }
    
    // Highlights (simulated via saturate boost)
    if (settings.highlights !== 50) {
      const highlightBoost = 0.8 + (settings.highlights / 100) * 0.4;
      filters.push(`saturate(${highlightBoost.toFixed(2)})`);
    }
    
    // Hue shift
    if (settings.hueShift > 0) {
      filters.push(`hue-rotate(${settings.hueShift}deg)`);
    }
    
    return filters.length > 0 ? filters.join(' ') : 'none';
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <iframe
        ref={iframeRef}
        src="/live-skyview.html"
        className="w-full h-full border-none"
        style={{
          transform: 'scale(1.02)',
          transformOrigin: 'center',
          filter: getIframeFilter(),
          transition: 'filter 0.3s ease',
        }}
        onLoad={() => setIsLoaded(true)}
        title="Live Sky Background"
        sandbox="allow-scripts allow-same-origin"
      />
      
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isLoaded ? 0 : 1 }}
      />
    </div>
  );
};

export default SkyIframeBackground;
