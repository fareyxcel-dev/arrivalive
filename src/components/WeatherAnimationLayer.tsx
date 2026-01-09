import { useEffect, useRef, useMemo, useState } from 'react';

interface WeatherData {
  weather: {
    condition: string;
    windSpeed: number;
    windDirection: number;
    cloudCoverage: number;
  };
  rain: {
    active: boolean;
    intensity: number;
  };
}

interface Props {
  weatherData: WeatherData | null;
}

interface Cloud {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  layer: 'high' | 'mid' | 'low';
  blur: number;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

const WeatherAnimationLayer = ({ weatherData }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const cloudsRef = useRef<Cloud[]>([]);
  const rainRef = useRef<RainDrop[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Weather conditions
  const condition = weatherData?.weather?.condition?.toLowerCase() || 'clear';
  const windSpeed = weatherData?.weather?.windSpeed || 5;
  const windDirection = weatherData?.weather?.windDirection || 180;
  const cloudCoverage = weatherData?.weather?.cloudCoverage || 0;
  const rainActive = weatherData?.rain?.active || condition.includes('rain');
  const rainIntensity = weatherData?.rain?.intensity || (condition.includes('rain') ? 0.6 : 0);
  const isFoggy = condition.includes('fog') || condition.includes('mist') || condition.includes('haze');
  const isStormy = condition.includes('storm') || condition.includes('thunder');

  // Initialize clouds
  useEffect(() => {
    const cloudCount = Math.floor(cloudCoverage * 15) + 5;
    const clouds: Cloud[] = [];
    
    for (let i = 0; i < cloudCount; i++) {
      const layer = ['high', 'mid', 'low'][Math.floor(Math.random() * 3)] as Cloud['layer'];
      clouds.push({
        id: i,
        x: Math.random() * dimensions.width * 1.5 - dimensions.width * 0.25,
        y: dimensions.height * (0.05 + Math.random() * 0.45),
        width: 150 + Math.random() * 250,
        height: 60 + Math.random() * 80,
        speed: (layer === 'high' ? 0.15 : layer === 'mid' ? 0.3 : 0.5) * (1 + windSpeed * 0.05),
        opacity: layer === 'high' ? 0.3 : layer === 'mid' ? 0.5 : 0.7,
        layer,
        blur: layer === 'high' ? 8 : layer === 'mid' ? 5 : 3,
      });
    }
    cloudsRef.current = clouds;
  }, [cloudCoverage, dimensions.width, dimensions.height, windSpeed]);

  // Initialize rain drops
  useEffect(() => {
    if (!rainActive) {
      rainRef.current = [];
      return;
    }
    
    const dropCount = Math.floor(rainIntensity * 400) + 100;
    const drops: RainDrop[] = [];
    
    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        speed: 12 + Math.random() * 8 + rainIntensity * 5,
        length: 15 + Math.random() * 20,
        opacity: 0.2 + Math.random() * 0.3,
      });
    }
    rainRef.current = drops;
  }, [rainActive, rainIntensity, dimensions.width, dimensions.height]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const windOffset = Math.sin((windDirection * Math.PI) / 180) * windSpeed * 0.1;

    const drawCloud = (cloud: Cloud) => {
      ctx.save();
      ctx.filter = `blur(${cloud.blur}px)`;
      
      // Cloud color based on weather
      let cloudColor = 'rgba(220, 225, 235,';
      if (isStormy) {
        cloudColor = 'rgba(80, 85, 100,';
      } else if (rainActive) {
        cloudColor = 'rgba(140, 150, 170,';
      } else if (condition.includes('overcast')) {
        cloudColor = 'rgba(160, 170, 190,';
      }
      
      // Draw fluffy cloud shape with multiple circles
      const segments = 7;
      for (let i = 0; i < segments; i++) {
        const progress = i / (segments - 1);
        const offsetX = (progress - 0.5) * cloud.width * 0.8;
        const offsetY = Math.sin(progress * Math.PI) * cloud.height * 0.3;
        const radius = (cloud.height / 2) * (0.5 + Math.sin(progress * Math.PI) * 0.5);
        
        ctx.beginPath();
        ctx.arc(cloud.x + offsetX, cloud.y + offsetY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${cloudColor}${cloud.opacity})`;
        ctx.fill();
      }
      
      ctx.restore();
    };

    const drawRain = () => {
      if (!rainActive || rainRef.current.length === 0) return;
      
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 200, 220, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      rainRef.current.forEach((drop, i) => {
        ctx.globalAlpha = drop.opacity;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + windOffset * 2, drop.y + drop.length);
        ctx.stroke();
        
        // Update position
        drop.y += drop.speed;
        drop.x += windOffset;
        
        // Reset if off screen
        if (drop.y > dimensions.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * dimensions.width;
        }
        if (drop.x > dimensions.width) drop.x = 0;
        if (drop.x < 0) drop.x = dimensions.width;
      });
      
      ctx.restore();
    };

    const drawFog = () => {
      if (!isFoggy) return;
      
      ctx.save();
      
      // Create horizontal fog bands
      const fogBands = 5;
      for (let i = 0; i < fogBands; i++) {
        const y = dimensions.height * (0.4 + (i / fogBands) * 0.5);
        const gradient = ctx.createLinearGradient(0, y - 50, 0, y + 50);
        gradient.addColorStop(0, 'rgba(200, 210, 220, 0)');
        gradient.addColorStop(0.5, 'rgba(200, 210, 220, 0.15)');
        gradient.addColorStop(1, 'rgba(200, 210, 220, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - 50, dimensions.width, 100);
      }
      
      ctx.restore();
    };

    const drawLightning = () => {
      if (!isStormy) return;
      if (Math.random() > 0.002) return; // Rare flashes
      
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw lightning bolt
      const startX = dimensions.width * (0.2 + Math.random() * 0.6);
      const startY = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      let x = startX;
      let y = startY;
      while (y < dimensions.height * 0.6) {
        x += (Math.random() - 0.5) * 40;
        y += 20 + Math.random() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Sort clouds by layer for proper depth
      const sortedClouds = [...cloudsRef.current].sort((a, b) => {
        const order = { high: 0, mid: 1, low: 2 };
        return order[a.layer] - order[b.layer];
      });
      
      // Draw clouds with parallax
      sortedClouds.forEach(cloud => {
        drawCloud(cloud);
        
        // Update cloud position
        cloud.x += cloud.speed;
        
        // Wrap around
        if (cloud.x > dimensions.width + cloud.width) {
          cloud.x = -cloud.width;
          cloud.y = dimensions.height * (0.05 + Math.random() * 0.45);
        }
      });
      
      // Draw fog
      drawFog();
      
      // Draw rain
      drawRain();
      
      // Draw lightning
      drawLightning();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, condition, windSpeed, windDirection, rainActive, rainIntensity, isFoggy, isStormy]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default WeatherAnimationLayer;
