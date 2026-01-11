import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  scheduledTime: string;
  estimatedTime: string;
  flightDate: string;
  status: string;
  trackingProgress?: number;
  textColor: string;
  trackActiveColor: string;
  trackInactiveColor: string;
  onCountdownChange?: (countdown: string) => void;
}

// Calculate time remaining in human-readable format
const formatCountdown = (minutes: number): string => {
  if (minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
};

// Parse time string to minutes since midnight
const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Calculate progress based on current time vs scheduled/estimated
const calculateProgress = (
  scheduledTime: string,
  estimatedTime: string,
  flightDate: string,
  trackingProgress?: number
): { progress: number; minutesRemaining: number } => {
  if (trackingProgress !== undefined && trackingProgress > 0) {
    const now = new Date();
    const [estHours, estMinutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const estimated = new Date(flightDate + 'T00:00:00+05:00');
    estimated.setHours(estHours, estMinutes, 0, 0);
    const minutesRemaining = (estimated.getTime() - now.getTime()) / (1000 * 60);
    return { progress: trackingProgress, minutesRemaining: Math.max(0, minutesRemaining) };
  }

  const now = new Date();
  const scheduledMinutes = parseTimeToMinutes(scheduledTime);
  const estimatedMinutes = parseTimeToMinutes(estimatedTime || scheduledTime);
  
  const maldivesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Indian/Maldives' }));
  const currentMinutes = maldivesTime.getHours() * 60 + maldivesTime.getMinutes();
  
  const departureMinutes = scheduledMinutes - 240;
  const totalDuration = estimatedMinutes - departureMinutes;
  const elapsed = currentMinutes - departureMinutes;
  
  const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  const minutesRemaining = Math.max(0, estimatedMinutes - currentMinutes);
  
  return { progress, minutesRemaining };
};

// Generate CSS filter to colorize white image to target color
const getColorFilter = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const brightness = luminance * 100;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const hue = Math.round(h * 360);
  const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
  
  return `brightness(0) saturate(100%) invert(1) sepia(100%) saturate(${Math.max(100, saturation * 10)}%) hue-rotate(${hue}deg) brightness(${Math.max(80, brightness)}%)`;
};

// Helper to convert hex to rgb values
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

const FlightProgressBar = ({
  scheduledTime,
  estimatedTime,
  flightDate,
  status,
  trackingProgress,
  textColor,
  trackActiveColor,
  trackInactiveColor,
  onCountdownChange,
}: Props) => {
  const [progress, setProgress] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLandingPulse, setIsLandingPulse] = useState(false);
  const [fadeProgress, setFadeProgress] = useState(1);
  const [iconScale, setIconScale] = useState(1);

  const isLanded = status.toUpperCase() === 'LANDED';
  const isCancelled = status.toUpperCase() === 'CANCELLED';

  // Calculate hours until landing for visibility
  const hoursUntilLanding = useMemo(() => {
    const now = new Date();
    const [hours, minutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const estimated = new Date(flightDate + 'T00:00:00+05:00');
    estimated.setHours(hours, minutes, 0, 0);
    return (estimated.getTime() - now.getTime()) / (1000 * 60 * 60);
  }, [scheduledTime, estimatedTime, flightDate]);

  // Fade out 45-90 mins after landing based on traffic
  const minutesSinceLanding = useMemo(() => {
    if (!isLanded) return 0;
    const now = new Date();
    const [hours, minutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const landed = new Date(flightDate + 'T00:00:00+05:00');
    landed.setHours(hours, minutes, 0, 0);
    return (now.getTime() - landed.getTime()) / (1000 * 60);
  }, [isLanded, scheduledTime, estimatedTime, flightDate]);

  // Handle visibility and post-landing animation
  useEffect(() => {
    if (isCancelled) {
      setIsVisible(false);
      return;
    }

    if (isLanded) {
      // Fade out between 45-90 minutes (average 67.5 mins)
      const fadeOutDuration = 45 + Math.random() * 45;
      if (minutesSinceLanding < fadeOutDuration) {
        setIsVisible(true);
        setProgress(100);
        const fadeValue = Math.max(0, 1 - (minutesSinceLanding / fadeOutDuration));
        setFadeProgress(fadeValue);
        setIconScale(0.4 + fadeValue * 0.6);
      } else {
        setIsVisible(false);
      }
      return;
    }

    const shouldShow = (trackingProgress !== undefined && trackingProgress > 0) || 
                       (hoursUntilLanding <= 4 && hoursUntilLanding > 0);
    setIsVisible(shouldShow);
    setFadeProgress(1);
  }, [isCancelled, isLanded, trackingProgress, hoursUntilLanding, minutesSinceLanding]);

  // Update progress
  useEffect(() => {
    if (!isVisible || isLanded) return;

    const updateProgress = () => {
      const { progress: newProgress, minutesRemaining: newMinutes } = calculateProgress(
        scheduledTime,
        estimatedTime,
        flightDate,
        trackingProgress
      );
      setProgress(newProgress);
      setMinutesRemaining(newMinutes);
      
      const countdown = formatCountdown(newMinutes);
      onCountdownChange?.(countdown);
      
      // Activate landing pulse in final 5 minutes with soft glow
      setIsLandingPulse(newMinutes <= 5 && newMinutes > 0);
      
      const growProgress = Math.min(newProgress / 100, 1);
      setIconScale(0.8 + (growProgress * 0.4));
    };

    updateProgress();
    const interval = setInterval(updateProgress, 30000);

    return () => clearInterval(interval);
  }, [isVisible, isLanded, scheduledTime, estimatedTime, flightDate, trackingProgress, onCountdownChange]);

  useEffect(() => {
    if (!isVisible) {
      onCountdownChange?.('');
    }
  }, [isVisible, onCountdownChange]);

  if (!isVisible) return null;

  const colorFilter = getColorFilter(textColor);
  const planePosition = Math.min(progress, 98);
  const barHeight = 10;

  return (
    <div 
      className={cn(
        "relative rounded-full overflow-visible transition-all duration-500"
      )}
      style={{ 
        height: `${barHeight}px`,
        opacity: fadeProgress,
        transform: `scaleY(${fadeProgress})`,
        transformOrigin: 'center',
      }}
    >
      {/* Glassmorphism track with dark scrim */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{ 
          background: `linear-gradient(90deg, 
            rgba(${hexToRgb(trackInactiveColor)}, 0.2) 0%, 
            rgba(${hexToRgb(trackInactiveColor)}, 0.3) 100%)`,
          backdropFilter: 'blur(8px)',
          boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            inset 0 -1px 2px rgba(0, 0, 0, 0.2)
          `,
        }}
      />
      
      {/* Active track with soft glow */}
      <div 
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${progress}%`,
          background: `linear-gradient(90deg, 
            rgba(${hexToRgb(trackActiveColor)}, 0.4) 0%, 
            rgba(${hexToRgb(trackActiveColor)}, 0.6) 100%)`,
          boxShadow: `0 0 8px rgba(${hexToRgb(trackActiveColor)}, 0.4)`,
        }}
      />
      
      {/* Aircraft icon */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10"
        )}
        style={{ 
          left: `${planePosition}%`,
          transform: `translate(-50%, -50%) scale(${iconScale})`,
          filter: isLandingPulse ? `drop-shadow(0 0 6px rgba(${hexToRgb(textColor)}, 0.6))` : 'none',
        }}
      >
        <img 
          src="https://ik.imagekit.io/jv0j9qvtw/F9UqOabfPVMjAAAAAElFTkSuQmCC(1).png"
          alt="Flight"
          className="w-5 h-5 object-contain"
          style={{ 
            filter: colorFilter,
            opacity: isLandingPulse ? 1 : 0.9,
          }}
        />
      </div>
    </div>
  );
};

export default FlightProgressBar;
