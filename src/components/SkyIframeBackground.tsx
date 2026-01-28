import { useRef, useState } from 'react';

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

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Full-screen iframe with the uploaded HTML */}
      <iframe
        ref={iframeRef}
        src="/live-skyview.html"
        className="w-full h-full border-none"
        style={{
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
