import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightProgressBar from './FlightProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subscribeToNotifications, addFlightTag, removeFlightTag, setExternalUserId, loadOneSignalScript } from '@/lib/onesignal';

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

// Airline name mapping - names must match ImageKit file naming exactly
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

// Status-based theme colors with enhanced glassmorphism tints
const getStatusTheme = (status: string) => {
  switch (status.toUpperCase()) {
    case 'LANDED':
      return {
        cardTint: 'rgba(16, 232, 185, 0.12)',
        cardScrim: 'rgba(0, 0, 0, 0.25)',
        trackInactive: '#0f6955',
        trackActive: '#30c2a2',
        textColor: '#81f0d8',
        statusBg: 'rgba(16, 232, 185, 0.2)',
        bellColor: '#81f0d8',
        bellGlow: 'rgba(16, 232, 185, 0.3)',
      };
    case 'DELAYED':
      return {
        cardTint: 'rgba(235, 82, 12, 0.12)',
        cardScrim: 'rgba(0, 0, 0, 0.25)',
        trackInactive: '#a1441a',
        trackActive: '#c25e30',
        textColor: '#f2763d',
        statusBg: 'rgba(235, 82, 12, 0.2)',
        bellColor: '#f7a26f',
        bellGlow: 'rgba(242, 118, 61, 0.35)',
      };
    case 'CANCELLED':
      return {
        cardTint: 'rgba(191, 15, 36, 0.12)',
        cardScrim: 'rgba(0, 0, 0, 0.25)',
        trackInactive: '#5a0a15',
        trackActive: '#bf0f24',
        textColor: '#f7485d',
        statusBg: 'rgba(191, 15, 36, 0.2)',
        bellColor: '#f7485d',
        bellGlow: 'rgba(247, 72, 93, 0.3)',
      };
    default:
      return {
        cardTint: 'rgba(191, 239, 255, 0.08)',
        cardScrim: 'rgba(0, 0, 0, 0.2)',
        trackInactive: 'rgba(127, 220, 255, 0.3)',
        trackActive: 'rgba(255, 255, 255, 0.6)',
        textColor: '#ffffff',
        statusBg: 'rgba(255, 255, 255, 0.12)',
        bellColor: '#bfefff',
        bellGlow: 'rgba(127, 220, 255, 0.3)',
      };
  }
};

// Convert 24h time to 12h format
const formatTime = (time: string, format: '12h' | '24h') => {
  if (format === '24h' || !time) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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

// Airline Icon Component with color matching
const AirlineIcon = ({ airlineCode, color }: { airlineCode: string; color: string }) => {
  const [imageError, setImageError] = useState(false);
  const [urlIndex, setUrlIndex] = useState(0);
  
  const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
  const colorFilter = getColorFilter(color);
  
  // Multiple URL patterns to try for each airline
  const getUrlPatterns = () => {
    const base = 'https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/';
    
    // Standard pattern: "AK (AirAsia).png" encoded
    const standardUrl = `${base}${airlineCode}%20(${encodeURIComponent(airlineName)}).png`;
    
    // Pattern with spaces: "AK (AirAsia).png" with space as %20
    const spaceUrl = `${base}${airlineCode}%20%28${encodeURIComponent(airlineName)}%29.png`;
    
    // Simple pattern: just airline code
    const simpleUrl = `${base}${airlineCode}.png`;
    
    // Pattern without parentheses encoding
    const altUrl = `${base}${airlineCode}%20(${airlineName.replace(/ /g, '%20')}).png`;
    
    return [standardUrl, spaceUrl, altUrl, simpleUrl];
  };
  
  const urls = getUrlPatterns();
  
  const handleError = () => {
    if (urlIndex < urls.length - 1) {
      setUrlIndex(urlIndex + 1);
    } else {
      setImageError(true);
    }
  };
  
  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-xs font-semibold" style={{ color }}>
          {airlineCode}
        </span>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img 
        src={urls[urlIndex]}
        alt={airlineName}
        className="max-w-[48px] max-h-[24px] object-contain"
        style={{ filter: colorFilter }}
        onError={handleError}
      />
    </div>
  );
};

// Subscribe to push notifications via OneSignal
const subscribeToFlightNotifications = async (userId: string, flightId: string, flightDate: string): Promise<boolean> => {
  try {
    // Initialize OneSignal and get permission
    const playerId = await subscribeToNotifications();
    
    if (!playerId) {
      toast.error('Push notification permission denied');
      return false;
    }

    // Set external user ID for targeting
    await setExternalUserId(userId);
    
    // Add flight tag for this subscription
    await addFlightTag(flightId, flightDate);

    // Save player ID to profile
    await supabase
      .from('profiles')
      .upsert({ 
        user_id: userId,
        onesignal_player_id: playerId,
      }, {
        onConflict: 'user_id',
      });

    // Create notification subscription for this flight
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        flight_id: flightId,
        flight_date: flightDate,
        notify_push: true,
      }, {
        onConflict: 'user_id,flight_id,flight_date',
      });

    if (error) {
      console.error('Subscription error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Push subscription error:', error);
    return false;
  }
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const theme = getStatusTheme(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  const isLanded = flight.status.toUpperCase() === 'LANDED';
  const isCancelled = flight.status.toUpperCase() === 'CANCELLED';
  const isDelayed = flight.status.toUpperCase() === 'DELAYED';
  
  // Status/Bell logic
  const hasTerminalStatus = isLanded || isCancelled || isDelayed;
  const showStatusBadge = hasTerminalStatus;
  const showBellRow1 = !hasTerminalStatus;
  const showBellRow2 = isDelayed;
  const showProgressBar = !isCancelled;

  const handleLogoClick = () => {
    if (showAirlineName) return;
    setShowAirlineName(true);
    setIsFadingOut(false);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setIsFadingOut(true);
      timeoutRef.current = setTimeout(() => {
        setShowAirlineName(false);
        setIsFadingOut(false);
      }, 500);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle notification toggle with push subscription
  const handleBellClick = async () => {
    if (isSubscribing) return;
    
    setIsSubscribing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to enable notifications');
        setIsSubscribing(false);
        return;
      }

      if (isNotificationEnabled) {
        // Unsubscribe
        await removeFlightTag(flight.flightId, flight.date);
        await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('flight_id', flight.flightId)
          .eq('flight_date', flight.date);
        
        onToggleNotification(flight.id);
        toast.success(`Notifications disabled for ${flight.flightId}`);
      } else {
        // Subscribe with OneSignal push
        const success = await subscribeToFlightNotifications(user.id, flight.flightId, flight.date);
        
        if (success) {
          onToggleNotification(flight.id);
          toast.success(`Notifications enabled for ${flight.flightId}`);
        }
      }
    } catch (error) {
      console.error('Notification toggle error:', error);
      toast.error('Failed to update notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Handle countdown updates from progress bar
  const handleCountdownChange = (newCountdown: string) => {
    setCountdown(newCountdown);
  };

  const scheduledTimeFormatted = formatTime(flight.scheduledTime, settings.timeFormat);
  const estimatedTimeFormatted = formatTime(flight.estimatedTime, settings.timeFormat);

  return (
    <div 
      className="rounded-[18px] overflow-hidden"
      style={{ 
        // Strong glassmorphism with status tint
        background: `linear-gradient(135deg, ${theme.cardTint} 0%, ${theme.cardScrim} 100%)`,
        backdropFilter: 'blur(24px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
        // Polished glass edge effects
        boxShadow: `
          0 6px 24px 0 rgba(0, 0, 0, 0.15),
          inset 0 3px 6px -3px rgba(255, 255, 255, 0.25),
          inset 0 -3px 6px -3px rgba(0, 0, 0, 0.2),
          inset 3px 0 6px -4px rgba(255, 255, 255, 0.15),
          inset -3px 0 6px -4px rgba(0, 0, 0, 0.15)
        `,
        padding: '8px 10px',
        maxHeight: '95px',
      }}
    >
      {/* TOP SECTION - Ultra Compact 2 Rows */}
      <div className="flex gap-2 items-center">
        {/* Airline Logo - Spans 2 rows visually */}
        <button
          onClick={handleLogoClick}
          className="w-10 h-8 flex-shrink-0 flex items-center justify-center transition-all duration-300"
        >
          {showAirlineName ? (
            <div 
              className={cn(
                "backdrop-blur-md rounded px-1 py-0.5 transition-opacity duration-300",
                isFadingOut && "opacity-0"
              )}
              style={{ backgroundColor: `${theme.textColor}15` }}
            >
              <span 
                className="text-[6px] font-medium text-center leading-tight block drop-shadow-md"
                style={{ color: theme.textColor }}
              >
                {airlineName}
              </span>
            </div>
          ) : (
            <AirlineIcon airlineCode={flight.airlineCode} color={theme.textColor} />
          )}
        </button>

        {/* Separator with glow */}
        <span 
          className="text-base font-light flex-shrink-0 drop-shadow-sm" 
          style={{ color: theme.textColor, opacity: 0.4 }}
        >|</span>

        {/* Flight Info + Status/Bell in Grid */}
        <div className="flex-1 flex flex-col justify-center min-w-0 gap-0">
          {/* Row 1: Flight Number + Status Badge OR Bell */}
          <div className="flex items-center justify-between">
            <span 
              className="font-bold text-[11px] leading-none drop-shadow-md" 
              style={{ color: theme.textColor }}
            >
              {flight.flightId}
            </span>
            
            {showStatusBadge && (
              <div 
                className="px-1.5 py-0.5 rounded-full text-[7px] font-semibold uppercase tracking-wide drop-shadow-sm animate-pulse"
                style={{ 
                  backgroundColor: theme.statusBg,
                  color: theme.textColor,
                  boxShadow: `0 0 6px ${theme.bellGlow}`,
                }}
              >
                {flight.status}
              </div>
            )}
            
            {showBellRow1 && (
              <button
                onClick={handleBellClick}
                disabled={isSubscribing}
                className={cn(
                  "p-0.5 rounded-full flex-shrink-0 transition-all duration-300",
                  isNotificationEnabled && "animate-pulse",
                  isSubscribing && "opacity-50"
                )}
                style={{
                  boxShadow: isNotificationEnabled ? `0 0 10px ${theme.bellGlow}` : 'none',
                }}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-2.5 h-2.5 drop-shadow-md" style={{ color: theme.bellColor }} />
                ) : (
                  <Bell className="w-2.5 h-2.5 drop-shadow-md" style={{ color: theme.bellColor, opacity: 0.65 }} />
                )}
              </button>
            )}
          </div>
          
          {/* Row 2: Origin + Bell (for delayed) */}
          <div className="flex items-center justify-between -mt-0.5">
            <span 
              className="text-[10px] truncate opacity-80 leading-none drop-shadow-sm" 
              style={{ color: theme.textColor }}
            >
              {flight.origin}
            </span>
            
            {showBellRow2 && (
              <button
                onClick={handleBellClick}
                disabled={isSubscribing}
                className={cn(
                  "p-0.5 rounded-full flex-shrink-0 transition-all duration-300",
                  isNotificationEnabled && "animate-pulse",
                  isSubscribing && "opacity-50"
                )}
                style={{
                  boxShadow: isNotificationEnabled ? `0 0 10px ${theme.bellGlow}` : 'none',
                }}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-2.5 h-2.5 drop-shadow-md" style={{ color: theme.bellColor }} />
                ) : (
                  <Bell className="w-2.5 h-2.5 drop-shadow-md" style={{ color: theme.bellColor, opacity: 0.7 }} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - Rows 3-4 */}
      <div className="mt-1">
        {/* Labels with countdown */}
        <div className="flex items-center justify-between text-[8px] mb-0.5" style={{ color: `${theme.textColor}70` }}>
          <span className="drop-shadow-sm">Scheduled</span>
          {showProgressBar && countdown && (
            <span className="text-[8px] font-medium drop-shadow-sm" style={{ color: theme.textColor }}>
              {countdown}
            </span>
          )}
          <span className="drop-shadow-sm">Estimated</span>
        </div>
        
        {/* Times + Progress Bar - Compact */}
        <div className="flex items-center gap-1">
          <span className="font-bold text-[10px] flex-shrink-0 w-11 text-left drop-shadow-md" style={{ color: theme.textColor }}>
            {scheduledTimeFormatted}
          </span>
          
          {showProgressBar && (
            <div className="flex-1">
              <FlightProgressBar
                scheduledTime={flight.scheduledTime}
                estimatedTime={flight.estimatedTime}
                flightDate={flight.date}
                status={flight.status}
                trackingProgress={flight.trackingProgress}
                textColor={theme.textColor}
                trackActiveColor={theme.trackActive}
                trackInactiveColor={theme.trackInactive}
                onCountdownChange={handleCountdownChange}
              />
            </div>
          )}
          
          <span className="font-bold text-[10px] flex-shrink-0 w-11 text-right drop-shadow-md" style={{ color: theme.textColor }}>
            {estimatedTimeFormatted}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;