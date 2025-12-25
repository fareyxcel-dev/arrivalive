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

const FlightProgressBar = ({
  scheduledTime,
  estimatedTime,
  flightDate,
  status,
  trackingProgress,
  textColor,
  trackActiveColor,
  trackInactiveColor,
}: Props) => {
  const [progress, setProgress] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLandingPulse, setIsLandingPulse] = useState(false);

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

  // Calculate hours since landing for fade-out
  const hoursSinceLanding = useMemo(() => {
    if (!isLanded) return 0;
    const now = new Date();
    const [hours, minutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const landed = new Date(flightDate + 'T00:00:00+05:00');
    landed.setHours(hours, minutes, 0, 0);
    return (now.getTime() - landed.getTime()) / (1000 * 60 * 60);
  }, [isLanded, scheduledTime, estimatedTime, flightDate]);

  useEffect(() => {
    // Show progress bar: when flight is in air OR 4 hours before arrival
    // Hide: if cancelled, or 45 mins after landing
    if (isCancelled) {
      setIsVisible(false);
      return;
    }

    if (isLanded) {
      // Fade out 45 mins after landing
      if (hoursSinceLanding < 0.75) {
        setIsVisible(true);
        setProgress(100);
      } else {
        setIsVisible(false);
      }
      return;
    }

    // Show if tracking data exists or within 4 hours of arrival
    const shouldShow = (trackingProgress !== undefined && trackingProgress > 0) || 
                       (hoursUntilLanding <= 4 && hoursUntilLanding > 0);
    setIsVisible(shouldShow);
  }, [isCancelled, isLanded, trackingProgress, hoursUntilLanding, hoursSinceLanding]);

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
      
      // Activate landing pulse in final 5 minutes
      setIsLandingPulse(newMinutes <= 5 && newMinutes > 0);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isVisible, isLanded, scheduledTime, estimatedTime, flightDate, trackingProgress]);

  if (!isVisible) return null;

  const countdown = formatCountdown(minutesRemaining);

  return (
    <div className={cn(
      "relative h-6 rounded-full overflow-hidden transition-all duration-500",
      isLandingPulse && "flight-progress-pulse"
    )}>
      {/* Inactive track */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: trackInactiveColor }}
      />
      
      {/* Active track */}
      <div 
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${progress}%`,
          backgroundColor: trackActiveColor,
        }}
      />
      
      {/* Countdown text overlay */}
      {countdown && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center text-[10px] font-medium transition-opacity duration-300",
            isLandingPulse && "countdown-pulse"
          )}
          style={{ color: textColor }}
        >
          {countdown}
        </div>
      )}
      
      {/* Aircraft icon moving along the progress */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-1000 ease-out z-10",
          isLandingPulse && "flight-icon-glow"
        )}
        style={{ left: `${Math.min(progress, 95)}%` }}
      >
        {/* Plane SVG from provided ImageKit URL - scaled down */}
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="transform -rotate-90"
          style={{ color: textColor }}
        >
          <path 
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};

export default FlightProgressBar;
