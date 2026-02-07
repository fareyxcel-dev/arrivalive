import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightProgressBar from './FlightProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subscribeToNotifications, addFlightTag, removeFlightTag, setExternalUserId } from '@/lib/onesignal';

export interface Flight {
  id: string;
  flightId: string;
  origin: string;
  scheduledTime: string;
  estimatedTime: string;
  terminal: string;
  status: string;
  date: string;
  airlineCode: string;
  airlineLogo?: string;
  trackingProgress?: number;
}

interface Props {
  flight: Flight;
  isNotificationEnabled: boolean;
  onToggleNotification: (flightId: string) => void;
}

// Airline name mapping
const AIRLINE_NAMES: Record<string, string> = {
  '3U': 'Sichuan Airlines', '4Y': 'Discover Airlines', '6E': 'IndiGo', '8D': 'FitsAir',
  'AF': 'Air France', 'AI': 'Air India', 'AK': 'Air Asia', 'AZ': 'ITA Airways',
  'B4': 'beOnd', 'BA': 'British Airways', 'BS': 'US-Bangla Airlines', 'DE': 'Condor',
  'EK': 'Emirates', 'EY': 'Etihad Airways', 'FD': 'Thai Air Asia', 'FZ': 'FlyDubai',
  'G9': 'Air Arabia', 'GF': 'Gulf Air', 'HX': 'Hong Kong Airlines', 'HY': 'Uzbekistan Airways',
  'IB': 'Iberia', 'J2': 'Azerbaijan Airlines', 'J9': 'Jazeera Airways', 'JD': 'Beijing Capital Airlines',
  'KC': 'Air Astana', 'KU': 'Kuwait Airways', 'LO': 'LOT Polish Airlines', 'MH': 'Malaysia Airlines',
  'MU': 'China Eastern Airlines', 'NO': 'Neos', 'NR': 'MantaAir', 'OD': 'Batik Air Malaysia',
  'OS': 'Austrian Airlines', 'PG': 'Bangkok Airways', 'Q2': 'Maldivian', 'QR': 'Qatar Airways',
  'SH': 'FlyMe', 'SQ': 'Singapore Airlines', 'SU': 'Aeroflot', 'SV': 'Saudia',
  'TK': 'Turkish Airlines', 'UL': 'SriLankan Airlines', 'VP': 'VillaAir', 'VS': 'Virgin Atlantic',
  'W6': 'Wizz Air', 'WK': 'Edelweiss Air', 'WY': 'Oman Air', 'XY': 'Flynas', 'ZF': 'Azur Air',
};

// Theme colors per status
const getStatusTheme = (status: string) => {
  switch (status.toUpperCase()) {
    case 'LANDED':
      return {
        cardTint: '#10e8b9',
        progressInactive: '#0f6955',
        progressActive: '#30c2a2',
        textColor: '#81f0d8',
        bellColor: '#81f0d8',
        bellGlow: 'rgba(16, 232, 185, 0.4)',
      };
    case 'DELAYED':
      return {
        cardTint: '#eb520c',
        progressInactive: '#a1441a',
        progressActive: '#c25e30',
        textColor: '#f2763d',
        bellColor: '#f2763d',
        bellGlow: 'rgba(235, 82, 12, 0.4)',
      };
    case 'CANCELLED':
      return {
        cardTint: '#bf0f24',
        progressInactive: '#7a081b',
        progressActive: '#bf0f24',
        textColor: '#f7485d',
        bellColor: '#f7485d',
        bellGlow: 'rgba(191, 15, 36, 0.4)',
      };
    default:
      return {
        cardTint: '#3a4a5c',
        progressInactive: '#2a3a4c',
        progressActive: '#5a6a7c',
        textColor: '#DCE0DE',
        bellColor: '#DCE0DE',
        bellGlow: 'rgba(220, 224, 222, 0.35)',
      };
  }
};

const formatTime = (time: string, format: '12h' | '24h') => {
  if (format === '24h' || !time) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Abbreviated time: "14:30" → "14:30", "2:30 PM" → "2:30p"
const formatTimeShort = (time: string, format: '12h' | '24h') => {
  if (format === '24h' || !time) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'p' : 'a';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
};

const getColorFilter = (hexColor: string): string => {
  const hex = hexColor.replace('#', '').toLowerCase();
  if (hex === 'ffffff' || hex === 'fff' || hex === 'dce0de') return 'brightness(0.95)';
  if (hex === '81f0d8') return 'brightness(0) saturate(100%) invert(85%) sepia(25%) saturate(600%) hue-rotate(110deg) brightness(1.05)';
  if (hex === 'f2763d') return 'brightness(0) saturate(100%) invert(55%) sepia(80%) saturate(500%) hue-rotate(350deg) brightness(1.1)';
  if (hex === 'f7485d') return 'brightness(0) saturate(100%) invert(45%) sepia(80%) saturate(600%) hue-rotate(325deg) brightness(1.15)';
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const rNorm = r / 255; const gNorm = g / 255; const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  let h = 0; let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
    else h = ((rNorm - gNorm) / d + 4) / 6;
  }
  const hue = Math.round(h * 360);
  const sat = Math.round(s * 100);
  const light = Math.round(l * 100);
  const hueRotate = hue - 50;
  const saturation = Math.max(100, sat * 3);
  const brightness = light > 50 ? light / 60 : 0.8;
  return `brightness(0) saturate(100%) invert(${light > 50 ? 0.9 : 0.5}) sepia(1) saturate(${saturation}%) hue-rotate(${hueRotate}deg) brightness(${brightness})`;
};

// Airline Icon with 30-minute retry for missing logos
const AirlineIcon = ({ airlineCode, color }: { airlineCode: string; color: string }) => {
  const [imageError, setImageError] = useState(false);
  const [urlIndex, setUrlIndex] = useState(0);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
  const colorFilter = getColorFilter(color);
  
  const getUrlPatterns = () => {
    const base = 'https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/';
    return [
      `${base}${airlineCode}%20(${encodeURIComponent(airlineName)}).png`,
      `${base}${airlineCode}%20%28${encodeURIComponent(airlineName)}%29.png`,
      `${base}${airlineCode}%20(${airlineName.replace(/ /g, '%20')}).png`,
      `${base}${airlineCode}.png`,
    ];
  };
  
  const urls = getUrlPatterns();
  
  const handleError = () => {
    if (urlIndex < urls.length - 1) {
      setUrlIndex(urlIndex + 1);
    } else {
      setImageError(true);
    }
  };

  // Retry every 30 minutes if logo not found
  useEffect(() => {
    if (!imageError) return;
    retryIntervalRef.current = setInterval(() => {
      setImageError(false);
      setUrlIndex(0);
    }, 30 * 60 * 1000);
    return () => { if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
  }, [imageError]);

  useEffect(() => {
    return () => { if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
  }, []);
  
  if (imageError) {
    return (
      <span className="text-sm font-bold drop-shadow-md" style={{ color, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
        {airlineCode}
      </span>
    );
  }
  
  return (
    <img 
      src={urls[urlIndex]}
      alt={airlineName}
      className="max-w-[42px] max-h-[38px] object-contain"
      style={{ filter: `${colorFilter} drop-shadow(0 1px 4px rgba(0,0,0,0.5))` }}
      onError={handleError}
    />
  );
};

// Subscribe to push notifications via OneSignal
const subscribeToFlightNotifications = async (userId: string, flightId: string, flightDate: string): Promise<boolean> => {
  try {
    const playerId = await subscribeToNotifications();
    if (!playerId) { toast.error('Push notification permission denied'); return false; }
    await setExternalUserId(userId);
    await addFlightTag(flightId, flightDate);
    await supabase.from('profiles').upsert({ user_id: userId, onesignal_player_id: playerId }, { onConflict: 'user_id' });
    const { error } = await supabase.from('notification_subscriptions').upsert({
      user_id: userId, flight_id: flightId, flight_date: flightDate, notify_push: true,
    }, { onConflict: 'user_id,flight_id,flight_date' });
    if (error) { console.error('Subscription error:', error); return false; }
    return true;
  } catch (error) { console.error('Push subscription error:', error); return false; }
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [bellPulse, setBellPulse] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bellPulseRef = useRef<NodeJS.Timeout | null>(null);
  const autoCollapseRef = useRef<NodeJS.Timeout | null>(null);
  
  const theme = getStatusTheme(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  const isLanded = flight.status.toUpperCase() === 'LANDED';
  const isCancelled = flight.status.toUpperCase() === 'CANCELLED';
  const isDelayed = flight.status.toUpperCase() === 'DELAYED';
  const hasStatus = isLanded || isCancelled || isDelayed;
  
  // Bell only shows for non-landed, non-cancelled flights
  const showBell = !isLanded && !isCancelled;

  // Auto-collapse after 5 seconds or on scroll
  useEffect(() => {
    if (!isExpanded) return;
    
    // Auto collapse after 5 seconds
    autoCollapseRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
    
    // Collapse on scroll
    const handleScroll = () => {
      setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isExpanded]);

  // Bell pulse animation
  useEffect(() => {
    if (!showBell) return;
    const pulseInterval = isDelayed ? 7000 + Math.random() * 2000 : 6000 + Math.random() * 2000;
    const doPulse = () => {
      setBellPulse(true);
      setTimeout(() => setBellPulse(false), 800);
      bellPulseRef.current = setTimeout(doPulse, pulseInterval);
    };
    bellPulseRef.current = setTimeout(doPulse, pulseInterval);
    return () => { if (bellPulseRef.current) clearTimeout(bellPulseRef.current); };
  }, [showBell, isDelayed]);

  const handleLogoClick = () => {
    if (showAirlineName) return;
    setShowAirlineName(true);
    setIsFadingOut(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsFadingOut(true);
      timeoutRef.current = setTimeout(() => { setShowAirlineName(false); setIsFadingOut(false); }, 500);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (bellPulseRef.current) clearTimeout(bellPulseRef.current);
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, []);

  const handleBellClick = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to enable notifications'); setIsSubscribing(false); return; }
      if (isNotificationEnabled) {
        await removeFlightTag(flight.flightId, flight.date);
        await supabase.from('notification_subscriptions').delete().eq('user_id', user.id).eq('flight_id', flight.flightId).eq('flight_date', flight.date);
        onToggleNotification(flight.id);
        toast.success(`Notifications disabled for ${flight.flightId}`);
      } else {
        const success = await subscribeToFlightNotifications(user.id, flight.flightId, flight.date);
        if (success) { onToggleNotification(flight.id); toast.success(`Notifications enabled for ${flight.flightId}`); }
      }
    } catch (error) { console.error('Notification toggle error:', error); toast.error('Failed to update notifications'); }
    finally { setIsSubscribing(false); }
  };

  const handleCountdownChange = (newCountdown: string) => setCountdown(newCountdown);

  const scheduledTimeFormatted = formatTimeShort(flight.scheduledTime, settings.timeFormat);
  const estimatedTimeFormatted = formatTimeShort(flight.estimatedTime, settings.timeFormat);

  const cardStyle = {
    background: `linear-gradient(145deg, rgba(${hexToRgb(theme.cardTint)}, 0.08) 0%, rgba(0, 0, 0, 0.25) 100%)`,
    backdropFilter: 'blur(24px) saturate(1.3) brightness(1.1)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3) brightness(1.1)',
    border: `1px solid rgba(${hexToRgb(theme.cardTint)}, 0.15)`,
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.15)`,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.bell-button')) return;
    setIsExpanded(!isExpanded);
  };

  // Determine right label for flight tracker
  const getRightLabel = () => {
    if (isLanded) return 'Landed';
    if (isCancelled) return 'Cancelled';
    return 'Est';
  };

  // Determine what to show in the pill
  const getStatusText = () => {
    if (isLanded) return 'LANDED';
    if (isCancelled) return 'CANCELLED';
    if (isDelayed) return 'DELAYED';
    return '';
  };

  // Number of layers in the pill
  const pillLayers = [];
  if (hasStatus) pillLayers.push('status');
  if (!isExpanded) pillLayers.push('time');
  if (showBell) pillLayers.push('bell');

  return (
    <div 
      className="rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
      style={cardStyle}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 p-2.5">
        {/* LEFT: Airline Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center justify-center transition-all duration-300 flex-shrink-0"
        >
          {showAirlineName ? (
            <div className={cn("backdrop-blur-md rounded px-1.5 py-0.5 transition-opacity duration-300", isFadingOut && "opacity-0")}
              style={{ backgroundColor: `rgba(${hexToRgb(theme.textColor)}, 0.1)` }}>
              <span className="text-[7px] font-medium text-center leading-tight block"
                style={{ color: theme.textColor, opacity: 0.9, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {airlineName}
              </span>
            </div>
          ) : (
            <AirlineIcon airlineCode={flight.airlineCode} color={theme.textColor} />
          )}
        </button>

        {/* CENTER: Flight ID + Origin stacked */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="font-bold text-sm leading-tight truncate"
            style={{ color: theme.textColor, opacity: 0.9, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {flight.flightId}
          </span>
          <span className="text-[11px] truncate leading-tight"
            style={{ color: theme.textColor, opacity: 0.9, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
            {flight.origin}
          </span>
        </div>

        {/* RIGHT: Multi-layered pill container */}
        <div 
          className="flex items-center gap-0 flex-shrink-0 rounded-full overflow-hidden transition-all duration-500 ease-out"
          style={{
            background: `rgba(${hexToRgb(theme.cardTint)}, ${hasStatus ? 0.15 : 0.08})`,
            border: `1px solid rgba(${hexToRgb(theme.cardTint)}, ${hasStatus ? 0.25 : 0.12})`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Status text layer */}
          {hasStatus && (
            <span 
              className="text-[8px] font-semibold uppercase tracking-wide px-2 py-1.5 whitespace-nowrap"
              style={{ 
                color: theme.textColor,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {getStatusText()}
            </span>
          )}

          {/* Time layer - transitions out when expanded */}
          <div 
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{
              maxWidth: isExpanded ? '0px' : '80px',
              opacity: isExpanded ? 0 : 1,
              padding: isExpanded ? '0' : undefined,
            }}
          >
            {hasStatus && (
              <div className="w-px h-3 bg-white/20 flex-shrink-0" />
            )}
            <span 
              className="text-[10px] font-medium px-2 py-1.5 whitespace-nowrap block"
              style={{ color: theme.textColor, opacity: 0.85, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {estimatedTimeFormatted}
            </span>
          </div>

          {/* Bell layer - becomes the orb when alone */}
          {showBell && (
            <>
              {(hasStatus || !isExpanded) && (
                <div className="w-px h-3 bg-white/20 flex-shrink-0" />
              )}
              <div className="px-1.5 py-1 flex-shrink-0">
                <BellButton
                  isActive={isNotificationEnabled}
                  isPulsing={bellPulse}
                  isSubscribing={isSubscribing}
                  bellColor={theme.bellColor}
                  bellGlow={theme.bellGlow}
                  onClick={handleBellClick}
                  isDelayed={isDelayed}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded bottom: single row with abbreviated labels */}
      {isExpanded && (
        <div 
          className="flex items-center gap-1 px-2.5 pb-2.5 animate-fade-in"
        >
          <span className="font-bold text-[9px] flex-shrink-0 whitespace-nowrap"
            style={{ color: theme.textColor, opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {scheduledTimeFormatted}
          </span>
          
          <div className="flex-1 relative">
            {!isCancelled ? (
              <FlightProgressBar
                scheduledTime={flight.scheduledTime}
                estimatedTime={flight.estimatedTime}
                flightDate={flight.date}
                status={flight.status}
                trackingProgress={flight.trackingProgress}
                textColor={theme.textColor}
                trackActiveColor={theme.progressActive}
                trackInactiveColor={theme.progressInactive}
                onCountdownChange={handleCountdownChange}
                rightLabel={getRightLabel()}
                showCountdownInline={true}
              />
            ) : (
              <div className="h-[10px] rounded-full" style={{ 
                background: `rgba(${hexToRgb(theme.progressInactive)}, 0.3)`,
              }} />
            )}
          </div>
          
          <span className="font-bold text-[9px] flex-shrink-0 whitespace-nowrap"
            style={{ color: theme.textColor, opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {estimatedTimeFormatted}
          </span>
        </div>
      )}
    </div>
  );
};

// Bell button component
const BellButton = ({ isActive, isPulsing, isSubscribing, bellColor, bellGlow, onClick, isDelayed = false }: {
  isActive: boolean; isPulsing: boolean; isSubscribing: boolean; bellColor: string; bellGlow: string; onClick: () => void; isDelayed?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isSubscribing}
    className={cn("p-0.5 rounded-full flex-shrink-0 transition-all duration-300 bell-button", isSubscribing && "opacity-50")}
    style={{
      boxShadow: isActive ? `0 0 12px ${bellGlow}` : 'none',
      transform: isPulsing && !isActive ? (isDelayed ? 'scale(1.06)' : 'scale(1.05)') : 'scale(1)',
      opacity: isPulsing && !isActive ? 1 : undefined,
    }}
  >
    {isActive ? (
      <BellRing className="w-3 h-3" style={{ color: bellColor, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
    ) : (
      <Bell className="w-3 h-3" style={{ color: bellColor, opacity: isPulsing ? 1 : 0.65, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
    )}
  </button>
);

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default FlightCard;
