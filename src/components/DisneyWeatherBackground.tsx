import { useEffect, useRef, useMemo } from 'react';

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

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  size: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  speed: number;
  layer: 'high' | 'mid' | 'low';
  segments: Array<{ offsetX: number; offsetY: number; radius: number }>;
}

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  layer: number;
}

interface Props {
  weatherData: WeatherData | null;
}

const DisneyWeatherBackground = ({ weatherData }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const raindropsRef = useRef<Raindrop[]>([]);
  const lastTimeRef = useRef<number>(0);
  const lightningFlashRef = useRef<number>(0);
  const nextLightningRef = useRef<number>(0);

  // Generate stars once - expanded to cover more of the screen
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.75, // Extended from 0.6 to 0.75 for more coverage
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        size: 0.5 + Math.random() * 1.5,
      });
    }
    starsRef.current = stars;
  }, []);

  // Generate Disney-style fluffy clouds - expanded coverage
  useEffect(() => {
    if (!weatherData) return;
    
    const cloudCoverage = weatherData.weather.cloudCoverage;
    const windSpeed = weatherData.weather.windSpeed;
    const count = Math.floor((cloudCoverage / 100) * 15) + 5; // More clouds
    
    const clouds: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      const layer = i % 3 === 0 ? 'high' : i % 3 === 1 ? 'mid' : 'low';
      const baseWidth = layer === 'high' ? 150 : layer === 'mid' ? 200 : 250;
      const width = baseWidth + Math.random() * 150;
      const height = width * 0.4;
      
      // Generate fluffy cloud segments (Disney style)
      const segmentCount = 5 + Math.floor(Math.random() * 4);
      const segments = [];
      for (let j = 0; j < segmentCount; j++) {
        const progress = j / (segmentCount - 1);
        const offsetX = (progress - 0.5) * width * 0.8;
        const offsetY = Math.sin(progress * Math.PI) * height * 0.3 - height * 0.2;
        const radius = (height / 2) * (0.6 + Math.sin(progress * Math.PI) * 0.4);
        segments.push({ offsetX, offsetY, radius });
      }
      
      // Expanded Y range for better coverage - clouds now span 0.05 to 0.85 of viewport
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
      clouds.push({
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        y: layer === 'high' ? 0.05 * windowHeight + Math.random() * 0.2 * windowHeight :
           layer === 'mid' ? 0.25 * windowHeight + Math.random() * 0.3 * windowHeight :
           0.55 * windowHeight + Math.random() * 0.3 * windowHeight,
        width,
        height,
        opacity: layer === 'high' ? 0.3 : layer === 'mid' ? 0.5 : 0.7,
        speed: (layer === 'high' ? 0.15 : layer === 'mid' ? 0.3 : 0.5) * (1 + windSpeed * 0.02),
        layer,
        segments,
      });
    }
    cloudsRef.current = clouds;
  }, [weatherData?.weather.cloudCoverage, weatherData?.weather.windSpeed]);

  // Generate raindrops
  useEffect(() => {
    if (!weatherData?.rain.active) {
      raindropsRef.current = [];
      return;
    }
    
    const intensity = weatherData.rain.intensity;
    const count = Math.floor(intensity * 200) + 50;
    
    const raindrops: Raindrop[] = [];
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * 3); // 0 = back, 1 = mid, 2 = front
      raindrops.push({
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
        speed: (8 + Math.random() * 6) * (1 + intensity * 0.5) * (0.7 + layer * 0.15),
        length: (15 + Math.random() * 20) * (0.7 + layer * 0.15),
        opacity: (0.2 + Math.random() * 0.3) * (0.6 + layer * 0.2),
        layer,
      });
    }
    raindropsRef.current = raindrops;
  }, [weatherData?.rain.active, weatherData?.rain.intensity]);

  // Main animation loop
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

    const drawGradient = () => {
      if (!weatherData) return;
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, weatherData.gradient.top);
      gradient.addColorStop(0.5, weatherData.gradient.mid);
      gradient.addColorStop(1, weatherData.gradient.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawStars = (time: number) => {
      if (!weatherData) return;
      
      const phase = weatherData.skyPhase;
      if (phase !== 'night' && phase !== 'astronomical' && phase !== 'nautical') return;
      
      const starOpacity = phase === 'night' ? 1 : phase === 'astronomical' ? 0.6 : 0.3;
      
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.5 + 0.5;
        const alpha = star.brightness * twinkle * starOpacity;
        
        // Disney-style star glow
        const x = star.x * canvas.width;
        const y = star.y * canvas.height;
        
        const glow = ctx.createRadialGradient(x, y, 0, x, y, star.size * 3);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        glow.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.3})`);
        glow.addColorStop(1, 'rgba(200, 220, 255, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Star core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawSun = () => {
      if (!weatherData?.celestialObjects.sun.visible) return;
      
      const { x, y } = weatherData.celestialObjects.sun.position;
      const sunX = x * canvas.width;
      const sunY = y * canvas.height;
      const radius = 40;
      
      // Disney-style sun with rays
      ctx.save();
      
      // Outer glow
      const outerGlow = ctx.createRadialGradient(sunX, sunY, radius, sunX, sunY, radius * 4);
      outerGlow.addColorStop(0, 'rgba(255, 250, 200, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(255, 220, 150, 0.1)');
      outerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius * 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Sun body gradient
      const sunGradient = ctx.createRadialGradient(sunX - 10, sunY - 10, 0, sunX, sunY, radius);
      sunGradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
      sunGradient.addColorStop(0.7, 'rgba(255, 230, 150, 1)');
      sunGradient.addColorStop(1, 'rgba(255, 200, 100, 0.8)');
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    };

    const drawMoon = () => {
      if (!weatherData?.celestialObjects.moon.visible) return;
      
      const moonObj = weatherData.celestialObjects.moon;
      const { phase, illumination } = moonObj;
      const moonX = moonObj.position.x * canvas.width;
      const moonY = moonObj.position.y * canvas.height;
      const radius = 25;
      
      ctx.save();
      
      // Moon glow - softer and more atmospheric
      const glowGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, radius * 3.5);
      glowGradient.addColorStop(0, `rgba(220, 230, 255, ${illumination / 100 * 0.4})`);
      glowGradient.addColorStop(0.3, `rgba(200, 215, 240, ${illumination / 100 * 0.2})`);
      glowGradient.addColorStop(0.6, `rgba(180, 200, 230, ${illumination / 100 * 0.1})`);
      glowGradient.addColorStop(1, 'rgba(150, 170, 200, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(moonX, moonY, radius * 3.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon body with realistic coloring
      const moonGradient = ctx.createRadialGradient(moonX - 5, moonY - 5, 0, moonX, moonY, radius);
      moonGradient.addColorStop(0, 'rgba(245, 248, 255, 1)');
      moonGradient.addColorStop(0.6, 'rgba(220, 225, 235, 1)');
      moonGradient.addColorStop(0.9, 'rgba(200, 208, 220, 0.95)');
      moonGradient.addColorStop(1, 'rgba(180, 190, 205, 0.8)');
      ctx.fillStyle = moonGradient;
      ctx.beginPath();
      ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon phase shadow - blend with sky instead of harsh black
      if (phase !== 0.5) {
        const shadowOffset = (phase < 0.5 ? -1 : 1) * (1 - Math.abs(phase - 0.5) * 2) * radius * 1.3;
        
        // Get sky color from gradient for blending
        const skyMidColor = weatherData.gradient.mid || 'rgb(30, 40, 60)';
        
        // Create a gradient shadow that blends with the sky
        const shadowGradient = ctx.createRadialGradient(
          moonX + shadowOffset, moonY, 0,
          moonX + shadowOffset, moonY, radius * 1.1
        );
        shadowGradient.addColorStop(0, skyMidColor);
        shadowGradient.addColorStop(0.7, skyMidColor);
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.arc(moonX + shadowOffset, moonY, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        // Add a subtle edge glow on the lit side
        const litSide = phase < 0.5 ? 1 : -1;
        const edgeGlow = ctx.createRadialGradient(
          moonX - litSide * radius * 0.3, moonY, 0,
          moonX - litSide * radius * 0.3, moonY, radius * 0.5
        );
        edgeGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        edgeGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = edgeGlow;
        ctx.beginPath();
        ctx.arc(moonX - litSide * radius * 0.3, moonY, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Subtle moon craters/texture - more realistic
      ctx.fillStyle = 'rgba(140, 150, 170, 0.08)';
      ctx.beginPath();
      ctx.arc(moonX - 8, moonY - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX + 5, moonY + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX + 2, moonY - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    };

    const drawClouds = (deltaTime: number) => {
      if (!weatherData) return;
      
      const windRad = (weatherData.weather.windDirection * Math.PI) / 180;
      const windX = Math.sin(windRad);
      
      // Sort clouds by layer for proper rendering
      const sortedClouds = [...cloudsRef.current].sort((a, b) => {
        const layerOrder = { high: 0, mid: 1, low: 2 };
        return layerOrder[a.layer] - layerOrder[b.layer];
      });
      
      sortedClouds.forEach(cloud => {
        // Move cloud
        cloud.x += cloud.speed * windX * deltaTime * 0.03;
        
        // Wrap around
        if (cloud.x > canvas.width + cloud.width) {
          cloud.x = -cloud.width;
        } else if (cloud.x < -cloud.width) {
          cloud.x = canvas.width + cloud.width;
        }
        
        // Disney-style fluffy cloud rendering with blur
        const brightness = weatherData.rain.active ? 0.4 : 0.7;
        const grayValue = Math.floor(brightness * 255);
        
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        
        // Apply blur for Disney-style softness based on layer
        const blurAmount = cloud.layer === 'high' ? 6 : cloud.layer === 'mid' ? 4 : 2;
        ctx.filter = `blur(${blurAmount}px)`;
        
        // Draw cloud with multiple overlapping circles
        cloud.segments.forEach(segment => {
          const cx = cloud.x + segment.offsetX;
          const cy = cloud.y + segment.offsetY;
          
          // Soft cloud gradient with enhanced edges
          const cloudGradient = ctx.createRadialGradient(
            cx - segment.radius * 0.2, cy - segment.radius * 0.2, 0,
            cx, cy, segment.radius
          );
          cloudGradient.addColorStop(0, `rgba(${grayValue + 40}, ${grayValue + 40}, ${grayValue + 40}, 1)`);
          cloudGradient.addColorStop(0.5, `rgba(${grayValue + 20}, ${grayValue + 20}, ${grayValue + 20}, 0.95)`);
          cloudGradient.addColorStop(0.8, `rgba(${grayValue}, ${grayValue}, ${grayValue}, 0.7)`);
          cloudGradient.addColorStop(1, `rgba(${grayValue - 20}, ${grayValue - 20}, ${grayValue - 20}, 0)`);
          
          ctx.fillStyle = cloudGradient;
          ctx.beginPath();
          ctx.arc(cx, cy, segment.radius * 1.1, 0, Math.PI * 2);
          ctx.fill();
        });
        
        ctx.filter = 'none';
        ctx.restore();
      });
    };

    const drawRain = (deltaTime: number) => {
      if (!weatherData?.rain.active) return;
      
      const windRad = (weatherData.weather.windDirection * Math.PI) / 180;
      const windOffset = Math.sin(windRad) * weatherData.weather.windSpeed * 0.3;
      
      raindropsRef.current.forEach(drop => {
        // Move raindrop
        drop.y += drop.speed * deltaTime * 0.5;
        drop.x += windOffset * deltaTime * 0.1;
        
        // Reset if off screen
        if (drop.y > canvas.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * canvas.width;
        }
        if (drop.x > canvas.width) drop.x = 0;
        if (drop.x < 0) drop.x = canvas.width;
        
        // Draw raindrop with motion blur effect
        const endX = drop.x + windOffset * 0.5;
        const endY = drop.y + drop.length;
        
        const rainGradient = ctx.createLinearGradient(drop.x, drop.y, endX, endY);
        rainGradient.addColorStop(0, `rgba(200, 210, 230, 0)`);
        rainGradient.addColorStop(0.3, `rgba(200, 210, 230, ${drop.opacity})`);
        rainGradient.addColorStop(1, `rgba(180, 200, 220, ${drop.opacity * 0.5})`);
        
        ctx.strokeStyle = rainGradient;
        ctx.lineWidth = 1 + drop.layer * 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      });
    };

    const drawLightning = (time: number) => {
      if (!weatherData?.lightning.active) return;
      
      // Handle lightning flash
      if (lightningFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlashRef.current})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        lightningFlashRef.current -= 0.05;
      }
      
      // Schedule next lightning
      if (time > nextLightningRef.current) {
        lightningFlashRef.current = 0.7 + Math.random() * 0.3;
        nextLightningRef.current = time + 3000 + Math.random() * 8000;
        
        // Draw lightning bolt
        const startX = Math.random() * canvas.width;
        const startY = 0;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        let x = startX;
        let y = startY;
        const segments = 8 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < segments; i++) {
          x += (Math.random() - 0.5) * 60;
          y += canvas.height / segments;
          ctx.lineTo(x, y);
          
          // Branch occasionally
          if (Math.random() > 0.7) {
            ctx.moveTo(x, y);
            const branchX = x + (Math.random() - 0.5) * 80;
            const branchY = y + canvas.height / segments * 0.5;
            ctx.lineTo(branchX, branchY);
            ctx.moveTo(x, y);
          }
        }
        ctx.stroke();
      }
    };

    let lastFrameTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply grayscale filter
      ctx.filter = 'grayscale(100%)';
      
      // Layer 0: Sky gradient
      drawGradient();
      
      // Layer 1: Stars (night only)
      drawStars(currentTime * 0.001);
      
      // Layer 2: Sun/Moon
      drawSun();
      drawMoon();
      
      // Layer 3: Clouds
      drawClouds(deltaTime);
      
      // Layer 4: Rain
      drawRain(deltaTime);
      
      // Layer 5: Lightning
      drawLightning(currentTime);
      
      ctx.filter = 'none';
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(performance.now());

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [weatherData]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: 'grayscale(100%)' }}
    />
  );
};

export default DisneyWeatherBackground;