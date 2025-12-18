import { useEffect, useState, useMemo } from 'react';

interface Props {
  isRaining: boolean;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
}

interface Raindrop {
  id: number;
  left: number;
  delay: number;
  duration: number;
  width: number;
  height: number;
  opacity: number;
}

const RainAnimation = ({ isRaining, precipitation, windSpeed, windDirection }: Props) => {
  const [raindrops, setRaindrops] = useState<Raindrop[]>([]);

  // Calculate rain parameters based on weather data
  const rainParams = useMemo(() => {
    // Precipitation: 0-10mm/h scale
    const intensity = Math.min(precipitation * 10, 100); // 0-100 drops
    const dropCount = Math.max(20, Math.floor(intensity));
    
    // Wind affects horizontal movement
    const windOffset = Math.sin((windDirection * Math.PI) / 180) * windSpeed * 10;
    
    // Speed based on precipitation intensity
    const baseDuration = 1.5 - (precipitation * 0.1); // 0.5s - 1.5s
    const duration = Math.max(0.5, baseDuration);
    
    return { dropCount, windOffset, duration };
  }, [precipitation, windSpeed, windDirection]);

  useEffect(() => {
    if (!isRaining) {
      setRaindrops([]);
      return;
    }

    const drops: Raindrop[] = [];
    for (let i = 0; i < rainParams.dropCount; i++) {
      drops.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: rainParams.duration + Math.random() * 0.5,
        width: 1 + Math.random() * 1,
        height: 15 + Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
    setRaindrops(drops);
  }, [isRaining, rainParams]);

  if (!isRaining || raindrops.length === 0) {
    return null;
  }

  return (
    <div className="rain-container">
      {raindrops.map((drop) => (
        <div
          key={drop.id}
          className="raindrop"
          style={{
            left: `${drop.left}%`,
            width: `${drop.width}px`,
            height: `${drop.height}px`,
            opacity: drop.opacity,
            animation: `rain-fall ${drop.duration}s linear infinite`,
            animationDelay: `${drop.delay}s`,
            ['--wind-offset' as any]: `${rainParams.windOffset}px`,
          }}
        />
      ))}
    </div>
  );
};

export default RainAnimation;
