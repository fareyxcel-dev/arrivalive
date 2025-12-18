import { useEffect, useState } from 'react';
import backgroundOverlay from '@/assets/background-overlay.png';
import weatherAssets from '@/assets/weather-assets.png';
import RainAnimation from './RainAnimation';

interface WeatherData {
  temp: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: number;
  isRaining?: boolean;
}

const SKY_COLORS = [
  { time: 0.0, color: '#151015' },   // Midnight
  { time: 0.2, color: '#303131' },   // Dawn
  { time: 0.25, color: '#474749' },  // Sunrise
  { time: 0.3, color: '#696969' },   // Early Morning
  { time: 0.4, color: '#767676' },   // Morning
  { time: 0.45, color: '#828288' },  // Daytime
  { time: 0.5, color: '#7f7f7f' },   // Noon
  { time: 0.55, color: '#828288' },  // Daytime
  { time: 0.65, color: '#666666' },  // Evening
  { time: 0.75, color: '#6d6d6d' },  // Sunset
  { time: 0.8, color: '#3a3939' },   // Dusk
  { time: 0.9, color: '#202020' },   // Night
  { time: 1.0, color: '#151015' },   // Midnight
];

const getCycleValue = (): number => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return (hours * 60 + minutes) / 1440;
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex = (c: string) => parseInt(c.slice(1), 16);
  const r = (h: number) => (h >> 16) & 255;
  const g = (h: number) => (h >> 8) & 255;
  const b = (h: number) => h & 255;

  const h1 = hex(color1);
  const h2 = hex(color2);

  const newR = Math.round(r(h1) + (r(h2) - r(h1)) * factor);
  const newG = Math.round(g(h1) + (g(h2) - g(h1)) * factor);
  const newB = Math.round(b(h1) + (b(h2) - b(h1)) * factor);

  return `rgb(${newR}, ${newG}, ${newB})`;
};

const getSkyGradient = (cycleValue: number): string[] => {
  let i = 0;
  while (i < SKY_COLORS.length - 1 && SKY_COLORS[i + 1].time <= cycleValue) {
    i++;
  }

  const start = SKY_COLORS[i];
  const end = SKY_COLORS[Math.min(i + 1, SKY_COLORS.length - 1)];
  const factor = end.time === start.time ? 0 : (cycleValue - start.time) / (end.time - start.time);

  const currentColor = interpolateColor(start.color, end.color, factor);
  
  const lighterColor = interpolateColor(currentColor, '#ffffff', 0.1);
  const darkerColor = interpolateColor(currentColor, '#000000', 0.2);

  return [lighterColor, currentColor, darkerColor];
};

interface Props {
  weather?: WeatherData | null;
}

const AnimatedBackground = ({ weather }: Props) => {
  const [gradientColors, setGradientColors] = useState<string[]>(['#151015', '#202020', '#151015']);

  useEffect(() => {
    const updateGradient = () => {
      const cycleValue = getCycleValue();
      setGradientColors(getSkyGradient(cycleValue));
    };

    updateGradient();
    const interval = setInterval(updateGradient, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Layer 1: Flowing Gradient Sky */}
      <div
        className="absolute inset-0 transition-all duration-[60000ms]"
        style={{
          background: `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`,
        }}
      />

      {/* Layer 2: Background Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url(${backgroundOverlay})`,
          backgroundSize: 'cover',
        }}
      />

      {/* Layer 3: Weather Assets with Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[200%] h-full animate-drift opacity-20"
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
      <div className="absolute inset-0 monochrome opacity-60 pointer-events-none" />
      
      {/* Glass-like reflection overlay */}
      <div className="absolute inset-0 glass-reflect pointer-events-none" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
