import { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Lazy load components
const SkyIframeBackground = lazy(() => import('./SkyIframeBackground'));
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

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Layer 0: Full-screen iframe shader background */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
      }>
        <SkyIframeBackground weatherData={weatherData} />
      </Suspense>

      {/* Layer 1: Weather Animation Layer (clouds, sun, moon, rain, fog, lightning) */}
      <Suspense fallback={null}>
        <WeatherAnimationLayer weatherData={weatherData} />
      </Suspense>

      {/* Layer 2: Subtle vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
