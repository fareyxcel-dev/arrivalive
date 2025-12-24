import { useEffect, useRef, useMemo } from 'react';

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  speed: number;
  layer: 'high' | 'mid' | 'low';
}

interface Props {
  cloudCoverage: number; // 0-100
  windSpeed: number;
  windDirection: number;
  isRaining: boolean;
  sunPosition?: { x: number; y: number; visible: boolean };
  moonPosition?: { x: number; y: number; visible: boolean };
}

const CloudLayer = ({ 
  cloudCoverage, 
  windSpeed, 
  windDirection, 
  isRaining,
  sunPosition,
  moonPosition 
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const cloudsRef = useRef<Cloud[]>([]);

  // Generate clouds based on coverage
  const cloudCount = useMemo(() => {
    return Math.floor((cloudCoverage / 100) * 15) + 3;
  }, [cloudCoverage]);

  // Initialize clouds
  useEffect(() => {
    const clouds: Cloud[] = [];
    for (let i = 0; i < cloudCount; i++) {
      const layer = i % 3 === 0 ? 'high' : i % 3 === 1 ? 'mid' : 'low';
      clouds.push({
        x: Math.random() * window.innerWidth,
        y: layer === 'high' ? Math.random() * 0.2 * window.innerHeight :
           layer === 'mid' ? 0.2 * window.innerHeight + Math.random() * 0.3 * window.innerHeight :
           0.5 * window.innerHeight + Math.random() * 0.3 * window.innerHeight,
        width: 100 + Math.random() * 200,
        height: 40 + Math.random() * 80,
        opacity: 0,
        speed: (layer === 'high' ? 0.3 : layer === 'mid' ? 0.5 : 0.8) * (1 + windSpeed * 0.1),
        layer,
      });
    }
    cloudsRef.current = clouds;
  }, [cloudCount, windSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Wind direction in radians
    const windRad = (windDirection * Math.PI) / 180;
    const windX = Math.sin(windRad);

    const drawCloud = (cloud: Cloud) => {
      // Calculate brightness based on sun/moon proximity
      let brightness = isRaining ? 0.3 : 0.6;
      
      if (sunPosition?.visible) {
        const distToSun = Math.hypot(cloud.x - sunPosition.x, cloud.y - sunPosition.y);
        if (distToSun < 200) {
          brightness = Math.min(0.9, brightness + (200 - distToSun) / 400);
        }
      }
      
      if (moonPosition?.visible) {
        const distToMoon = Math.hypot(cloud.x - moonPosition.x, cloud.y - moonPosition.y);
        if (distToMoon < 150) {
          brightness = Math.min(0.8, brightness + (150 - distToMoon) / 500);
        }
      }

      const grayValue = Math.floor(brightness * 255);
      ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${cloud.opacity * 0.5})`;
      
      // Draw fluffy cloud shape
      const segments = 5;
      ctx.beginPath();
      for (let i = 0; i < segments; i++) {
        const segX = cloud.x + (cloud.width / segments) * i;
        const segY = cloud.y + Math.sin(i * 0.8) * 10;
        const segRadius = (cloud.height / 2) * (0.7 + Math.sin(i * 1.2) * 0.3);
        ctx.arc(segX, segY, segRadius, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply greyscale filter
      ctx.filter = 'grayscale(100%)';

      cloudsRef.current.forEach((cloud, i) => {
        // Gradual fade in
        if (cloud.opacity < 0.7) {
          cloud.opacity += 0.002;
        }

        // Move cloud based on wind
        cloud.x += cloud.speed * windX;
        
        // Wrap around screen
        if (cloud.x > canvas.width + cloud.width) {
          cloud.x = -cloud.width;
        } else if (cloud.x < -cloud.width) {
          cloud.x = canvas.width + cloud.width;
        }

        drawCloud(cloud);
      });

      ctx.filter = 'none';
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [windDirection, isRaining, sunPosition, moonPosition]);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[2]"
      style={{ filter: 'grayscale(100%)' }}
    />
  );
};

export default CloudLayer;
