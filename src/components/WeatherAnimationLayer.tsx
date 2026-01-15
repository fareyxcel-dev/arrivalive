import { useEffect, useRef, useState } from 'react';

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
  celestialObjects?: {
    sun: { visible: boolean; position: { x: number; y: number }; brightness: number };
    moon: { visible: boolean; position: { x: number; y: number }; phase: number; illumination: number };
  };
  gradient?: {
    top: string;
    mid: string;
    bottom: string;
  };
}

interface Props {
  weatherData: WeatherData | null;
}

// Soft brush stroke cloud with background color blending
interface Cloud {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  variant: 'wispy' | 'fluffy' | 'dark' | 'storm';
  blur: number;
  layer: number;
  colorOffset: number; // For background blending
}

// Rain drop with physics
interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  windOffset: number;
  variant: 'light' | 'medium' | 'heavy';
}

// Parse any color format to RGB (hex, rgb, hsl, named colors)
function parseColorToRgb(color: string): { r: number; g: number; b: number } {
  // Default fallback color
  const fallback = { r: 200, g: 210, b: 225 };
  
  if (!color || typeof color !== 'string') return fallback;
  
  const trimmed = color.trim();
  
  // Try 6-digit hex
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(trimmed);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  
  // Try 3-digit hex (e.g., #FFF)
  result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(trimmed);
  if (result) {
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16),
    };
  }
  
  // Try rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  
  // Try hsl(h, s%, l%) or hsla
  const hslMatch = /hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i.exec(trimmed);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    
    // HSL to RGB conversion
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }
  
  return fallback;
}

// Blend color with background
function blendWithBackground(cloudColor: { r: number; g: number; b: number }, bgColor: { r: number; g: number; b: number }, blendAmount: number): string {
  const r = Math.round(cloudColor.r + (bgColor.r - cloudColor.r) * blendAmount);
  const g = Math.round(cloudColor.g + (bgColor.g - cloudColor.g) * blendAmount);
  const b = Math.round(cloudColor.b + (bgColor.b - cloudColor.b) * blendAmount);
  return `${r}, ${g}, ${b}`;
}

const WeatherAnimationLayer = ({ weatherData }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const cloudsRef = useRef<Cloud[]>([]);
  const rainRef = useRef<RainDrop[]>([]);
  const timeRef = useRef(0);
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

  // Background gradient colors for cloud blending
  const bgTop = weatherData?.gradient?.top || '#87ceeb';
  const bgMid = weatherData?.gradient?.mid || '#b0d4e8';
  const bgBottom = weatherData?.gradient?.bottom || '#d4e8f0';

  // Sun/Moon data
  const sunVisible = weatherData?.celestialObjects?.sun?.visible ?? false;
  const sunPos = weatherData?.celestialObjects?.sun?.position ?? { x: 0.5, y: 0.3 };
  const sunBrightness = weatherData?.celestialObjects?.sun?.brightness ?? 1;
  const moonVisible = weatherData?.celestialObjects?.moon?.visible ?? false;
  const moonPos = weatherData?.celestialObjects?.moon?.position ?? { x: 0.7, y: 0.2 };
  const moonPhase = weatherData?.celestialObjects?.moon?.phase ?? 0.5;
  const moonIllumination = weatherData?.celestialObjects?.moon?.illumination ?? 0.5;

  // Initialize clouds with variations and background color blending
  useEffect(() => {
    const cloudCount = Math.floor(cloudCoverage * 20) + 8;
    const clouds: Cloud[] = [];
    
    for (let i = 0; i < cloudCount; i++) {
      const layer = Math.floor(Math.random() * 3); // 0=far, 1=mid, 2=near
      let variant: Cloud['variant'] = 'fluffy';
      
      if (isStormy && Math.random() > 0.4) variant = 'storm';
      else if (rainActive && Math.random() > 0.5) variant = 'dark';
      else if (Math.random() > 0.7) variant = 'wispy';
      
      clouds.push({
        id: i,
        x: Math.random() * (dimensions.width + 600) - 300,
        y: dimensions.height * (0.02 + Math.random() * 0.4),
        width: 180 + Math.random() * 350 + (variant === 'storm' ? 150 : 0),
        height: 60 + Math.random() * 100 + (variant === 'storm' ? 40 : 0),
        speed: (0.1 + layer * 0.15) * (1 + windSpeed * 0.08),
        opacity: variant === 'storm' ? 0.8 : variant === 'dark' ? 0.65 : layer === 0 ? 0.25 : layer === 1 ? 0.4 : 0.55,
        variant,
        blur: layer === 0 ? 12 : layer === 1 ? 8 : 4,
        layer,
        colorOffset: Math.random() * 0.3, // Random blend amount with background
      });
    }
    cloudsRef.current = clouds.sort((a, b) => a.layer - b.layer);
  }, [cloudCoverage, dimensions.width, dimensions.height, windSpeed, isStormy, rainActive]);

  // Initialize rain drops with multiple layers
  useEffect(() => {
    if (!rainActive) {
      rainRef.current = [];
      return;
    }
    
    const dropCount = Math.floor(rainIntensity * 600) + 200;
    const drops: RainDrop[] = [];
    const windRad = (windDirection * Math.PI) / 180;
    
    for (let i = 0; i < dropCount; i++) {
      const variant: RainDrop['variant'] = 
        Math.random() < 0.2 ? 'heavy' : Math.random() < 0.5 ? 'medium' : 'light';
      
      drops.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height * 1.5 - dimensions.height * 0.5,
        speed: (variant === 'heavy' ? 22 : variant === 'medium' ? 16 : 10) + rainIntensity * 8,
        length: (variant === 'heavy' ? 35 : variant === 'medium' ? 22 : 12) + Math.random() * 10,
        opacity: variant === 'heavy' ? 0.5 : variant === 'medium' ? 0.35 : 0.2,
        windOffset: Math.sin(windRad) * windSpeed * 0.15,
        variant,
      });
    }
    rainRef.current = drops;
  }, [rainActive, rainIntensity, windSpeed, windDirection, dimensions]);

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

    // Parse background colors
    const bgTopRgb = parseColorToRgb(bgTop);
    const bgMidRgb = parseColorToRgb(bgMid);
    const bgBottomRgb = parseColorToRgb(bgBottom);

    // Draw soft brush stroke cloud with background color blending
    const drawCloud = (cloud: Cloud) => {
      ctx.save();
      ctx.filter = `blur(${cloud.blur}px)`;
      
      // Get background color based on cloud Y position (interpolate between top/mid/bottom)
      const yProgress = cloud.y / dimensions.height;
      let bgColor: { r: number; g: number; b: number };
      if (yProgress < 0.33) {
        const t = yProgress / 0.33;
        bgColor = {
          r: Math.round(bgTopRgb.r + (bgMidRgb.r - bgTopRgb.r) * t),
          g: Math.round(bgTopRgb.g + (bgMidRgb.g - bgTopRgb.g) * t),
          b: Math.round(bgTopRgb.b + (bgMidRgb.b - bgTopRgb.b) * t),
        };
      } else {
        const t = (yProgress - 0.33) / 0.67;
        bgColor = {
          r: Math.round(bgMidRgb.r + (bgBottomRgb.r - bgMidRgb.r) * t),
          g: Math.round(bgMidRgb.g + (bgBottomRgb.g - bgMidRgb.g) * t),
          b: Math.round(bgMidRgb.b + (bgBottomRgb.b - bgMidRgb.b) * t),
        };
      }
      
      // Cloud base color based on variant, blended with background
      let baseCloudColor: { r: number; g: number; b: number };
      switch (cloud.variant) {
        case 'storm':
          baseCloudColor = { r: 50, g: 55, b: 70 };
          break;
        case 'dark':
          baseCloudColor = { r: 100, g: 110, b: 130 };
          break;
        case 'wispy':
          baseCloudColor = { r: 240, g: 245, b: 255 };
          break;
        default:
          baseCloudColor = { r: 220, g: 230, b: 245 };
      }
      
      // Blend cloud color with background for "live blurred" effect
      const blendedColor = blendWithBackground(baseCloudColor, bgColor, cloud.colorOffset + Math.sin(timeRef.current * 0.5) * 0.05);
      
      // Draw multiple soft ellipses for brush stroke effect
      const segments = 9;
      for (let i = 0; i < segments; i++) {
        const progress = i / (segments - 1);
        const wave = Math.sin(progress * Math.PI);
        const offsetX = (progress - 0.5) * cloud.width * 0.9;
        const offsetY = wave * cloud.height * 0.35 + Math.sin(progress * Math.PI * 2 + timeRef.current * 0.5) * 5;
        const radiusX = (cloud.width / 5) * (0.6 + wave * 0.4);
        const radiusY = (cloud.height / 2.5) * (0.5 + wave * 0.5);
        
        // Create radial gradient for soft edges
        const gradient = ctx.createRadialGradient(
          cloud.x + offsetX, cloud.y + offsetY, 0,
          cloud.x + offsetX, cloud.y + offsetY, radiusX
        );
        gradient.addColorStop(0, `rgba(${blendedColor}, ${cloud.opacity * 0.8})`);
        gradient.addColorStop(0.6, `rgba(${blendedColor}, ${cloud.opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${blendedColor}, 0)`);
        
        ctx.beginPath();
        ctx.ellipse(cloud.x + offsetX, cloud.y + offsetY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      ctx.restore();
    };

    // Draw animated sun
    const drawSun = () => {
      if (!sunVisible || cloudCoverage > 0.8) return;
      
      const x = sunPos.x * dimensions.width;
      const y = sunPos.y * dimensions.height;
      const radius = 50 + Math.sin(timeRef.current * 0.5) * 5;
      const glowOpacity = sunBrightness * 0.4 * (1 - cloudCoverage * 0.5);
      
      ctx.save();
      
      // Outer glow
      const outerGradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 4);
      outerGradient.addColorStop(0, `rgba(255, 250, 220, ${glowOpacity})`);
      outerGradient.addColorStop(0.3, `rgba(255, 230, 180, ${glowOpacity * 0.5})`);
      outerGradient.addColorStop(1, 'rgba(255, 220, 150, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = outerGradient;
      ctx.fill();
      
      // Inner core
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      coreGradient.addColorStop(0, `rgba(255, 255, 240, ${sunBrightness * 0.6})`);
      coreGradient.addColorStop(0.7, `rgba(255, 245, 200, ${sunBrightness * 0.4})`);
      coreGradient.addColorStop(1, 'rgba(255, 230, 180, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
      
      ctx.restore();
    };

    // Draw animated moon with phase
    const drawMoon = () => {
      if (!moonVisible) return;
      
      const x = moonPos.x * dimensions.width;
      const y = moonPos.y * dimensions.height;
      const radius = 35;
      
      ctx.save();
      
      // Moon glow
      const glowGradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 3);
      glowGradient.addColorStop(0, `rgba(220, 230, 255, ${moonIllumination * 0.25})`);
      glowGradient.addColorStop(1, 'rgba(200, 210, 240, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      // Moon disc
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 235, 250, ${moonIllumination * 0.8})`;
      ctx.fill();
      
      // Phase shadow (waning/waxing)
      if (moonPhase !== 0.5) {
        ctx.beginPath();
        const phaseOffset = (moonPhase - 0.5) * radius * 2;
        ctx.ellipse(x + phaseOffset, y, Math.abs(phaseOffset), radius, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 25, 40, 0.85)';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.restore();
    };

    // Draw layered rain
    const drawRain = () => {
      if (!rainActive || rainRef.current.length === 0) return;
      
      ctx.save();
      ctx.lineCap = 'round';
      
      rainRef.current.forEach((drop) => {
        const alpha = drop.opacity * (drop.variant === 'heavy' ? 0.6 : 0.4);
        ctx.strokeStyle = `rgba(180, 200, 230, ${alpha})`;
        ctx.lineWidth = drop.variant === 'heavy' ? 2.5 : drop.variant === 'medium' ? 1.8 : 1;
        
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.windOffset * 3, drop.y + drop.length);
        ctx.stroke();
        
        // Update position
        drop.y += drop.speed;
        drop.x += drop.windOffset;
        
        // Reset if off screen
        if (drop.y > dimensions.height + drop.length) {
          drop.y = -drop.length - Math.random() * 100;
          drop.x = Math.random() * dimensions.width;
        }
        if (drop.x > dimensions.width + 50) drop.x = -50;
        if (drop.x < -50) drop.x = dimensions.width + 50;
      });
      
      ctx.restore();
    };

    // Draw fog overlay
    const drawFog = () => {
      if (!isFoggy) return;
      
      ctx.save();
      
      const fogBands = 6;
      for (let i = 0; i < fogBands; i++) {
        const y = dimensions.height * (0.35 + (i / fogBands) * 0.55);
        const offset = Math.sin(timeRef.current * 0.1 + i * 0.5) * 20;
        
        const gradient = ctx.createLinearGradient(0, y - 60, 0, y + 60);
        gradient.addColorStop(0, 'rgba(210, 215, 225, 0)');
        gradient.addColorStop(0.5, `rgba(210, 215, 225, ${0.12 + Math.sin(timeRef.current * 0.2 + i) * 0.03})`);
        gradient.addColorStop(1, 'rgba(210, 215, 225, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(offset, y - 60, dimensions.width, 120);
      }
      
      ctx.restore();
    };

    // Draw lightning
    const drawLightning = () => {
      if (!isStormy) return;
      if (Math.random() > 0.003) return;
      
      ctx.save();
      
      // Flash
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      // Lightning bolt
      const startX = dimensions.width * (0.15 + Math.random() * 0.7);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      
      let x = startX;
      let y = 0;
      while (y < dimensions.height * 0.55) {
        x += (Math.random() - 0.5) * 50;
        y += 15 + Math.random() * 25;
        ctx.lineTo(x, y);
        
        // Branch
        if (Math.random() > 0.7) {
          ctx.moveTo(x, y);
          const branchX = x + (Math.random() - 0.5) * 80;
          const branchY = y + 30 + Math.random() * 40;
          ctx.lineTo(branchX, branchY);
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
      
      ctx.restore();
    };

    const animate = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw sun first (behind clouds)
      drawSun();
      
      // Draw moon
      drawMoon();
      
      // Draw clouds with parallax and background blending
      cloudsRef.current.forEach(cloud => {
        drawCloud(cloud);
        
        // Update position
        cloud.x += cloud.speed;
        
        // Respawn off screen
        if (cloud.x > dimensions.width + cloud.width / 2) {
          cloud.x = -cloud.width;
          cloud.y = dimensions.height * (0.02 + Math.random() * 0.4);
          cloud.colorOffset = Math.random() * 0.3; // Randomize blend on respawn
        }
      });
      
      // Draw fog
      drawFog();
      
      // Draw rain (behind some clouds, in front of others)
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
  }, [dimensions, condition, windSpeed, windDirection, rainActive, rainIntensity, isFoggy, isStormy,
      sunVisible, sunPos, sunBrightness, moonVisible, moonPos, moonPhase, moonIllumination, cloudCoverage,
      bgTop, bgMid, bgBottom]);

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