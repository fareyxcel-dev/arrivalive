import { useState, useEffect, useMemo } from 'react';

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
  rightLabel?: string;
  showCountdownInline?: boolean;
}

const formatCountdown = (minutes: number): string => {
  if (minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

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
  rightLabel,
  showCountdownInline = false,
}: Props) => {
  const [progress, setProgress] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLandingPulse, setIsLandingPulse] = useState(false);
  const [fadeProgress, setFadeProgress] = useState(1);
  const [iconScale, setIconScale] = useState(1);
  const [countdownText, setCountdownText] = useState('');

  const isLanded = status.toUpperCase() === 'LANDED';
  const isCancelled = status.toUpperCase() === 'CANCELLED';

  const hoursUntilLanding = useMemo(() => {
    const now = new Date();
    const [hours, minutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const estimated = new Date(flightDate + 'T00:00:00+05:00');
    estimated.setHours(hours, minutes, 0, 0);
    return (estimated.getTime() - now.getTime()) / (1000 * 60 * 60);
  }, [scheduledTime, estimatedTime, flightDate]);

  const minutesSinceLanding = useMemo(() => {
    if (!isLanded) return 0;
    const now = new Date();
    const [hours, minutes] = (estimatedTime || scheduledTime).split(':').map(Number);
    const landed = new Date(flightDate + 'T00:00:00+05:00');
    landed.setHours(hours, minutes, 0, 0);
    return (now.getTime() - landed.getTime()) / (1000 * 60);
  }, [isLanded, scheduledTime, estimatedTime, flightDate]);

  useEffect(() => {
    if (isCancelled) { setIsVisible(false); return; }
    if (isLanded) {
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

  useEffect(() => {
    if (!isVisible || isLanded) return;
    const updateProgress = () => {
      const { progress: newProgress, minutesRemaining: newMinutes } = calculateProgress(
        scheduledTime, estimatedTime, flightDate, trackingProgress
      );
      setProgress(newProgress);
      setMinutesRemaining(newMinutes);
      const cd = formatCountdown(newMinutes);
      setCountdownText(cd);
      onCountdownChange?.(cd);
      setIsLandingPulse(newMinutes <= 5 && newMinutes > 0);
      const growProgress = Math.min(newProgress / 100, 1);
      setIconScale(0.8 + (growProgress * 0.4));
    };
    updateProgress();
    const interval = setInterval(updateProgress, 30000);
    return () => clearInterval(interval);
  }, [isVisible, isLanded, scheduledTime, estimatedTime, flightDate, trackingProgress, onCountdownChange]);

  useEffect(() => {
    if (!isVisible) onCountdownChange?.('');
  }, [isVisible, onCountdownChange]);

  if (!isVisible) return null;

  const planePosition = Math.min(progress, 98);
  const barHeight = 10;

  return (
    <div 
      className="relative rounded-full overflow-visible transition-all duration-500"
      style={{ 
        height: `${barHeight}px`,
        opacity: fadeProgress,
        transform: `scaleY(${fadeProgress})`,
        transformOrigin: 'center',
      }}
    >
      {/* Track background - glass pill style */}
      <div 
        className="absolute inset-0 rounded-full glass-pill"
        style={{ 
          background: `rgba(${hexToRgb(trackInactiveColor)}, 0.15)`,
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.08), inset 0 -1px 3px rgba(0,0,0,0.25)`,
          border: `1px solid rgba(${hexToRgb(trackInactiveColor)}, 0.1)`,
        }}
      />
      
      {/* Active track */}
      <div 
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${progress}%`,
          background: `linear-gradient(90deg, rgba(${hexToRgb(trackActiveColor)}, 0.3) 0%, rgba(${hexToRgb(trackActiveColor)}, 0.5) 100%)`,
          boxShadow: `0 0 8px rgba(${hexToRgb(trackActiveColor)}, 0.3)`,
        }}
      />

      {/* Countdown inline overlay */}
      {showCountdownInline && countdownText && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span 
            className="text-[7px] font-bold px-1 rounded"
            style={{ 
              color: textColor, 
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              opacity: 0.9,
            }}
          >
            {countdownText}
          </span>
        </div>
      )}
      
      {/* Aircraft icon - Glass Unicode Glyph ✈ */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10"
        style={{ 
          left: `${planePosition}%`,
          transform: `translate(-50%, -50%) scale(${iconScale})`,
        }}
      >
        <span
          className="text-sm leading-none select-none"
          style={{ 
            color: textColor,
            textShadow: `0 0 6px rgba(${hexToRgb(textColor)}, ${isLandingPulse ? 0.8 : 0.4}), 0 1px 3px rgba(0,0,0,0.5)`,
            filter: isLandingPulse ? `drop-shadow(0 0 6px rgba(${hexToRgb(textColor)}, 0.6))` : `drop-shadow(0 1px 2px rgba(0,0,0,0.4))`,
            opacity: isLandingPulse ? 1 : 0.9,
          }}
        >
          ✈
        </span>
      </div>
    </div>
  );
};

export default FlightProgressBar;
