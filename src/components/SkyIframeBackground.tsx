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

  // Calculate filter based on settings including monochrome advanced controls
  const getIframeFilter = () => {
    const filters: string[] = [];
    
    // Brightness
    if (settings.iframeBrightness !== 100) {
      filters.push(`brightness(${settings.iframeBrightness}%)`);
    }
    
    // Monochrome/grayscale with advanced controls
    if (settings.monochrome && settings.monochromeIntensity > 0) {
      filters.push(`grayscale(${settings.monochromeIntensity}%)`);
      
      // Contrast
      if (settings.monoContrast !== 100) {
        filters.push(`contrast(${settings.monoContrast}%)`);
      }
      
      // Shadows (simulated via brightness reduction at low values)
      // 0 = very dark shadows, 100 = lifted shadows
      const shadowBrightness = 0.7 + (settings.monoShadows / 100) * 0.6;
      if (settings.monoShadows !== 50) {
        // Only apply if not default
        filters.push(`brightness(${shadowBrightness.toFixed(2)})`);
      }
      
      // Highlights (simulated via saturate + brightness boost)
      if (settings.monoHighlights !== 50) {
        const highlightBoost = 0.8 + (settings.monoHighlights / 100) * 0.4;
        filters.push(`saturate(${highlightBoost.toFixed(2)})`);
      }
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