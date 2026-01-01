import { useEffect, useState } from 'react';
import DisneyWeatherBackground from './DisneyWeatherBackground';
import { supabase } from '@/integrations/supabase/client';

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

  // Fetch full weather astronomy data
  useEffect(() => {
    const fetchWeatherAstronomy = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-weather-astronomy');
        
        if (error) {
          console.error('Weather astronomy fetch error:', error);
          return;
        }
        
        if (data) {
          setWeatherData(data);
        }
      } catch (error) {
        console.error('Weather astronomy fetch error:', error);
      }
    };

    fetchWeatherAstronomy();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeatherAstronomy, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Disney 2D Style Animated Weather Background */}
      <DisneyWeatherBackground weatherData={weatherData} />

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