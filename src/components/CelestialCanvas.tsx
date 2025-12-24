import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Props {
  sunVisible: boolean;
  sunPosition: { x: number; y: number };
  moonVisible: boolean;
  moonPosition: { x: number; y: number };
  moonPhase: number; // 0-1 (0 = new moon, 0.5 = full moon, 1 = new moon)
  moonIllumination: number; // 0-100
  isNight: boolean;
  isDawn: boolean;
  isDusk: boolean;
}

const CelestialCanvas = ({
  sunVisible,
  sunPosition,
  moonVisible,
  moonPosition,
  moonPhase,
  moonIllumination,
  isNight,
  isDawn,
  isDusk,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);

  // Generate stars
  useEffect(() => {
    const stars: Star[] = [];
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.6,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

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

    let time = 0;

    const drawSun = () => {
      if (!sunVisible) return;

      const gradient = ctx.createRadialGradient(
        sunPosition.x, sunPosition.y, 0,
        sunPosition.x, sunPosition.y, 60
      );
      gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 230, 150, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 200, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Sun core
      ctx.fillStyle = 'rgba(255, 255, 230, 1)';
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, 20, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawMoon = () => {
      if (!moonVisible) return;

      // Moon glow
      const glowGradient = ctx.createRadialGradient(
        moonPosition.x, moonPosition.y, 0,
        moonPosition.x, moonPosition.y, 50
      );
      glowGradient.addColorStop(0, `rgba(200, 200, 220, ${moonIllumination / 100})`);
      glowGradient.addColorStop(0.5, `rgba(150, 150, 180, ${moonIllumination / 200})`);
      glowGradient.addColorStop(1, 'rgba(100, 100, 130, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(moonPosition.x, moonPosition.y, 50, 0, Math.PI * 2);
      ctx.fill();

      // Moon body
      ctx.fillStyle = `rgba(230, 230, 240, ${0.5 + moonIllumination / 200})`;
      ctx.beginPath();
      ctx.arc(moonPosition.x, moonPosition.y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Moon phase shadow
      if (moonPhase !== 0.5) {
        const shadowOffset = (moonPhase - 0.5) * 36;
        ctx.fillStyle = 'rgba(20, 20, 30, 0.7)';
        ctx.beginPath();
        ctx.arc(moonPosition.x + shadowOffset, moonPosition.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawStars = () => {
      if (!isNight && !isDawn && !isDusk) return;

      const starOpacity = isNight ? 1 : (isDawn || isDusk) ? 0.3 : 0;
      
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.5 + 0.5;
        const alpha = star.brightness * twinkle * starOpacity;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 1 + twinkle, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply greyscale filter
      ctx.filter = 'grayscale(100%)';

      drawStars();
      drawSun();
      drawMoon();

      ctx.filter = 'none';
      time += 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sunVisible, sunPosition, moonVisible, moonPosition, moonPhase, moonIllumination, isNight, isDawn, isDusk]);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{ filter: 'grayscale(100%)' }}
    />
  );
};

export default CelestialCanvas;
