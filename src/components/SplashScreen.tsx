import { useState, useEffect } from 'react';
import splashLogo from '@/assets/splash-logo.gif';

interface Props {
  isReady: boolean; // true when iframe loaded AND data fetched
}

const SplashScreen = ({ isReady }: Props) => {
  const [isFading, setIsFading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Minimum 2.5 seconds splash
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Start fade when both ready and min time elapsed
  useEffect(() => {
    if (isReady && minTimeElapsed && !isFading) {
      setIsFading(true);
      setTimeout(() => setIsHidden(true), 1500);
    }
  }, [isReady, minTimeElapsed, isFading]);

  if (isHidden) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-[1500ms]"
      style={{
        opacity: isFading ? 0 : 1,
        backdropFilter: `blur(${isFading ? 0 : 40}px)`,
        WebkitBackdropFilter: `blur(${isFading ? 0 : 40}px)`,
        background: isFading ? 'transparent' : 'rgba(0, 0, 0, 0.6)',
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <img
        src={splashLogo}
        alt="Arriva.MV"
        className="w-48 h-48 object-contain"
        style={{
          filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))',
          transform: isFading ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 1.5s ease-out',
        }}
      />
    </div>
  );
};

export default SplashScreen;
