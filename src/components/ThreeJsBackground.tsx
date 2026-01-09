import { useEffect, useRef, useMemo } from 'react';
import { initSkyOcean, SkyOceanUniforms } from '@/lib/SkyOceanShader';

interface WeatherData {
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
  weatherData: WeatherData | null;
}

const ThreeJsBackground = ({ weatherData }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shaderRef = useRef<{ cleanup: () => void; updateWeather: (u: SkyOceanUniforms) => void } | null>(null);

  // Convert weatherData to shader uniforms
  const shaderUniforms = useMemo((): SkyOceanUniforms => {
    if (!weatherData) return {};

    const condition = weatherData.weather?.condition || 'clear';
    const lowerCondition = condition.toLowerCase();

    return {
      weatherCondition: condition,
      cloudCoverage: weatherData.weather?.cloudCoverage || 
        (weatherData.clouds?.length ? Math.min(1, weatherData.clouds.length / 10) : 0),
      rainIntensity: weatherData.rain?.active ? weatherData.rain.intensity : 
        (lowerCondition.includes('rain') ? 0.6 : 0),
      isThunderstorm: lowerCondition.includes('thunder') || lowerCondition.includes('storm'),
      sunVisible: weatherData.celestialObjects?.sun?.visible,
      sunPosition: weatherData.celestialObjects?.sun?.position,
      sunBrightness: weatherData.celestialObjects?.sun?.brightness,
      moonVisible: weatherData.celestialObjects?.moon?.visible,
      moonPosition: weatherData.celestialObjects?.moon?.position,
      moonPhase: weatherData.celestialObjects?.moon?.phase,
      moonIllumination: weatherData.celestialObjects?.moon?.illumination,
    };
  }, [weatherData]);

  // Initialize shader on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const shader = initSkyOcean(containerRef.current, shaderUniforms);
    shaderRef.current = shader;

    return () => {
      shader.cleanup();
      shaderRef.current = null;
    };
  }, []);

  // Update shader uniforms when weather changes
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.updateWeather(shaderUniforms);
    }
  }, [shaderUniforms]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: 0 
      }}
    />
  );
};

export default ThreeJsBackground;
