import { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Lazy load Three.js background to avoid blocking initial render
const ThreeJsBackground = lazy(() => import('./ThreeJsBackground'));
const DisneyWeatherBackground = lazy(() => import('./DisneyWeatherBackground'));
const WeatherAnimationLayer = lazy(() => import('./WeatherAnimationLayer'));

interface WeatherPayload {
  gradient: { top: string; mid: string; bottom: string };
  skyPhase: string;
  celestialObjects: {
    sun: { visible: boolean; position: { x: number; y: number }; brightness: number };
    moon: { visible: boolean; position: { x: number; y: number }; phase: number; illumination: number };
  };
  clouds: Array<{ x: number; y: number; layer: string; opacity: number; width: number }>;
  rain: { active: boolean; intensity: number; windSpeed: number; windDirection: number };
  lightning: { active: boolean; events: Array<{ x: number; y: number; time: number }> };
  stars: Array<{ x: number; y: number; brightness: number }>;
  weather: {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCoverage: number;
  };
}

interface Props {
  weather?: { temp: number; condition: string } | null;
}

const AnimatedBackground = ({ weather }: Props) => {
  const [weatherData, setWeatherData] = useState<WeatherPayload | null>(null);
  const [useThreeJs, setUseThreeJs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full weather astronomy data
  useEffect(() => {
    const fetchWeatherAstronomy = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-weather-astronomy');
        
        if (error) {
          console.error('Weather astronomy fetch error:', error);
          setIsLoading(false);
          return;
        }
        
        if (data) {
          setWeatherData(data);
        }
      } catch (error) {
        console.error('Weather astronomy fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeatherAstronomy();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeatherAstronomy, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if WebGL is supported
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setUseThreeJs(false);
      }
    } catch (e) {
      setUseThreeJs(false);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Layer 0: Shader-based Sky + Ocean Background */}
      <Suspense fallback={
        <div 
          className="absolute inset-0" 
          style={{ 
            background: `linear-gradient(180deg, ${weatherData?.gradient?.top || '#0c0c0e'} 0%, ${weatherData?.gradient?.mid || '#141416'} 50%, ${weatherData?.gradient?.bottom || '#1c1c1f'} 100%)`,
          }} 
        />
      }>
        {useThreeJs && weatherData ? (
          <ThreeJsBackground weatherData={weatherData} />
        ) : (
          <DisneyWeatherBackground weatherData={weatherData} />
        )}
      </Suspense>

      {/* Layer 1: Weather Animation Layer (clouds, rain, fog, lightning) */}
      <Suspense fallback={null}>
        {weatherData && (
          <WeatherAnimationLayer weatherData={weatherData} />
        )}
      </Suspense>

      {/* Glass-like reflection overlay */}
      <div className="absolute inset-0 glass-reflect pointer-events-none" style={{ zIndex: 2 }} />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;