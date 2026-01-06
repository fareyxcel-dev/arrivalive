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
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
  return `${mins} min${mins !== 1 ? 's' : ''}`;
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
  // If we have real tracking data, use it
  if (trackingProgress !== undefined && trackingProgress > 0) {
    const now = new Date();
    const [estHours, estMinutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const estimated = new Date(flightDate + 'T00:00:00+05:00');
    estimated.setHours(estHours, estMinutes, 0, 0);
    const minutesRemaining = (estimated.getTime() - now.getTime()) / (1000 * 60);
    return { progress: trackingProgress, minutesRemaining: Math.max(0, minutesRemaining) };
  }

  // Time-based estimation (assume 4 hour flight average)
  const now = new Date();
  const scheduledMinutes = parseTimeToMinutes(scheduledTime);
  const estimatedMinutes = parseTimeToMinutes(estimatedTime || scheduledTime);
  
  // Get current time in Maldives timezone
  const maldivesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Indian/Maldives' }));
  const currentMinutes = maldivesTime.getHours() * 60 + maldivesTime.getMinutes();
  
  // Assume flight departs 4 hours before scheduled arrival
  const departureMinutes = scheduledMinutes - 240;
  const totalDuration = estimatedMinutes - departureMinutes;
  const elapsed = currentMinutes - departureMinutes;
  
  const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  const minutesRemaining = Math.max(0, estimatedMinutes - currentMinutes);
  
  return { progress, minutesRemaining };
};

// Generate CSS filter to colorize white image to target color (same as airline logos)
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
  const [fadeProgress, setFadeProgress] = useState(1); // 1 = fully visible, 0 = hidden
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

  // Calculate minutes since landing for gradual fade-out (20 minutes)
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
      if (minutesSinceLanding < 20) {
        setIsVisible(true);
        setProgress(100);
        // Gradual fade from 1 to 0 over 20 minutes
        const fadeValue = Math.max(0, 1 - (minutesSinceLanding / 20));
        setFadeProgress(fadeValue);
        // Icon shrinks as it fades
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

  // Update icon scale based on progress (grow as approaching landing)
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
      
      // Notify parent of countdown change
      const countdown = formatCountdown(newMinutes);
      onCountdownChange?.(countdown);
      
      // Activate landing pulse in final 5 minutes
      setIsLandingPulse(newMinutes <= 5 && newMinutes > 0);
      
      // Icon grows as it approaches landing (from 0.8 to 1.2)
      const growProgress = Math.min(newProgress / 100, 1);
      setIconScale(0.8 + (growProgress * 0.4));
    };

    updateProgress();
    const interval = setInterval(updateProgress, 30000);

    return () => clearInterval(interval);
  }, [isVisible, isLanded, scheduledTime, estimatedTime, flightDate, trackingProgress, onCountdownChange]);

  // Clear countdown when not visible
  useEffect(() => {
    if (!isVisible) {
      onCountdownChange?.('');
    }
  }, [isVisible, onCountdownChange]);

  if (!isVisible) return null;

  const colorFilter = getColorFilter(textColor);
  const planePosition = Math.min(progress, 98);
  
  // Dynamic height: 8px base, shrinks during post-landing fade
  const barHeight = 8 * fadeProgress;

  return (
    <div 
      className={cn(
        "relative rounded-full overflow-visible transition-all duration-500",
        isLandingPulse && "flight-progress-pulse"
      )}
      style={{ 
        height: `${Math.max(barHeight, 2)}px`,
        opacity: fadeProgress,
        transform: `scaleY(${fadeProgress})`,
        transformOrigin: 'center',
      }}
    >
      {/* Inactive track with live blur tint and transparency */}
      <div 
        className="absolute inset-0 rounded-full live-blur-tint"
        style={{ 
          background: `linear-gradient(90deg, ${trackInactiveColor}40, ${trackInactiveColor}60)`,
        }}
      />
      
      {/* Active track with gradient */}
      <div 
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${trackActiveColor}80, ${trackActiveColor})`,
        }}
      />
      
      {/* Aircraft icon with dynamic scaling and color matching */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10",
          isLandingPulse && "flight-icon-glow"
        )}
        style={{ 
          left: `${planePosition}%`,
          transform: `translate(-50%, -50%) scale(${iconScale})`,
        }}
      >
        <img 
          src="https://ik.imagekit.io/jv0j9qvtw/whiteshade-output(16).png?updatedAt=1766600584801"
          alt="Flight"
          className="w-5 h-5 object-contain"
          style={{ filter: colorFilter }}
        />
      </div>
    </div>
  );
};

export default FlightProgressBar;