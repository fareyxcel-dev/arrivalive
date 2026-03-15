import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightProgressBar from './FlightProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subscribeToNotifications, addFlightTag, removeFlightTag, setExternalUserId } from '@/lib/onesignal';
import { AIRLINE_NAMES, getLogoUrls, getCardTheme, hexToRgb } from '@/lib/cardStyles';

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

const formatTime = (time: string, format: '12h' | '24h') => {
  if (format === '24h' || !time) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Airline Icon using pre-colored logos from ImageKit
const AirlineIcon = ({ flightId, airlineCode, cardStyle, status, logoFilter }: { 
  flightId: string; airlineCode: string; cardStyle: string; status: string; logoFilter: string;
}) => {
  const [urlIndex, setUrlIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const urls = getLogoUrls(cardStyle, status, flightId, airlineCode);

  const handleError = () => {
    if (urlIndex < urls.length - 1) setUrlIndex(urlIndex + 1);
    else setImageError(true);
  };

  useEffect(() => {
    if (!imageError) return;
    retryIntervalRef.current = setInterval(() => { setImageError(false); setUrlIndex(0); }, 60 * 60 * 1000);
    return () => { if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
  }, [imageError]);

  useEffect(() => {
    return () => { if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
  }, []);

  useEffect(() => {
    setUrlIndex(0);
    setImageError(false);
  }, [cardStyle, status]);

  if (imageError) {
    return <span className="text-sm font-bold adaptive-shadow">{airlineCode}</span>;
  }

  return (
    <img
      src={urls[urlIndex]}
      alt={AIRLINE_NAMES[airlineCode] || airlineCode}
      className="max-w-[42px] max-h-[38px] object-contain adaptive-icon-shadow"
      style={{ filter: logoFilter }}
      onError={handleError}
    />
  );
};

// Subscribe to push notifications via OneSignal (gracefully handles failures on preview domains)
const subscribeToFlightNotifications = async (userId: string, flightId: string, flightDate: string): Promise<{ success: boolean; pushWorked: boolean }> => {
  let pushWorked = false;
  try {
    let playerId: string | null = null;
    try {
      playerId = await subscribeToNotifications();
      if (playerId) {
        pushWorked = true;
        await setExternalUserId(userId);
        await addFlightTag(flightId, flightDate);
        await supabase.from('profiles').upsert({ user_id: userId, onesignal_player_id: playerId }, { onConflict: 'user_id' });
      }
    } catch (pushError) {
      console.warn('Push provider unavailable (preview domain?):', pushError);
    }

    const { error } = await supabase.from('notification_subscriptions').upsert({
      user_id: userId, flight_id: flightId, flight_date: flightDate, notify_push: true,
    }, { onConflict: 'user_id,flight_id,flight_date' });
    if (error) { console.error('Subscription error:', error); return { success: false, pushWorked }; }
    return { success: true, pushWorked };
  } catch (error) { console.error('Subscription error:', error); return { success: false, pushWorked }; }
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCollapseRef = useRef<NodeJS.Timeout | null>(null);

  const theme = getCardTheme(settings.cardStyle, flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  const isLanded = flight.status.toUpperCase() === 'LANDED';
  const isCancelled = flight.status.toUpperCase() === 'CANCELLED';
  const isDelayed = flight.status.toUpperCase() === 'DELAYED';
  const hasStatus = isLanded || isCancelled || isDelayed;
  const showBell = !isLanded && !isCancelled;

  // Card visual sliders
  const logoFilter = `brightness(${settings.cardLogoBrightness / 100}) contrast(${settings.cardLogoContrast / 100}) saturate(${settings.cardLogoSaturation / 100}) hue-rotate(${settings.cardLogoHueShift}deg)`;

  // Gradient text style for gradient card styles
  const gradientTextStyle = theme.gradientColors ? {
    background: `linear-gradient(to bottom, ${theme.gradientColors[0]}, ${theme.gradientColors[1]}, ${theme.gradientColors[2]})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties : { color: theme.textColor, opacity: 0.9 } as React.CSSProperties;

  // Regular text style (non-gradient)
  const plainTextStyle = { color: theme.textColor, opacity: 0.9 } as React.CSSProperties;

  // Pick gradient or plain based on card style
  const textStyle = theme.gradientColors ? gradientTextStyle : plainTextStyle;

  // Auto-collapse after 5 seconds or on scroll
  useEffect(() => {
    if (!isExpanded) return;
    autoCollapseRef.current = setTimeout(() => setIsExpanded(false), 5000);
    const handleScroll = () => setIsExpanded(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isExpanded]);

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
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, []);

  const handleBellClick = async () => {
    if (isSubscribing) return;
    try { navigator?.vibrate?.(50); } catch {}
    setIsSubscribing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to enable notifications'); setIsSubscribing(false); return; }
      if (isNotificationEnabled) {
        try { await removeFlightTag(flight.flightId, flight.date); } catch {}
        await supabase.from('notification_subscriptions').delete().eq('user_id', user.id).eq('flight_id', flight.flightId).eq('flight_date', flight.date);
        onToggleNotification(flight.flightId);
        toast.success(`Notifications disabled for ${flight.flightId}`);
      } else {
        const result = await subscribeToFlightNotifications(user.id, flight.flightId, flight.date);
        if (result.success) {
          onToggleNotification(flight.flightId);
          if (result.pushWorked) {
            toast.success(`Notifications enabled for ${flight.flightId} from ${flight.origin}`);
          } else {
            toast.success(`Subscribed to ${flight.flightId} (push notifications active on published app)`);
          }
        }
      }
    } catch (error) { console.error('Notification toggle error:', error); toast.error('Failed to update notifications'); }
    finally { setIsSubscribing(false); }
  };

  const handleCountdownChange = (newCountdown: string) => setCountdown(newCountdown);

  const estimatedTimeFormatted = formatTime(flight.estimatedTime, settings.timeFormat);
  const scheduledTimeFormatted = formatTime(flight.scheduledTime, settings.timeFormat);

  // Increased status color intensity + animation class
  const statusBgOpacity = hasStatus ? 0.15 : 0.08;
  const statusAnimClass = hasStatus
    ? (theme.isGlass && theme.isGradient ? 'status-combined-anim' : theme.isGlass ? 'status-glass-shimmer' : theme.isGradient ? 'status-gradient-sweep' : 'status-pulse-anim')
    : '';

  const cardStyle = {
    background: `linear-gradient(145deg, rgba(${hexToRgb(theme.cardTint)}, ${statusBgOpacity}) 0%, rgba(0, 0, 0, 0.25) 100%)`,
    backdropFilter: 'blur(24px) saturate(1.3) brightness(1.1)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3) brightness(1.1)',
    border: `1px solid rgba(${hexToRgb(theme.cardTint)}, 0.15)`,
    boxShadow: `0 0 15px rgba(${hexToRgb(theme.cardTint)}, ${hasStatus ? 0.15 : 0.05}), 0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.15)`,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.bell-button')) return;
    setIsExpanded(!isExpanded);
  };

  const getStatusText = () => {
    if (isLanded) return 'LANDED';
    if (isCancelled) return 'CANCELLED';
    if (isDelayed) return 'DELAYED';
    return '';
  };

  return (
    <div
      className={cn("rounded-2xl overflow-hidden flight-card-animate cursor-pointer glass-neumorphic", statusAnimClass)}
      style={cardStyle}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 p-2.5">
        {/* LEFT: Airline Logo */}
        <button onClick={handleLogoClick} className="flex items-center justify-center transition-all duration-300 flex-shrink-0">
          {showAirlineName ? (
            <div className={cn("flex items-center justify-center w-[42px] h-[38px] transition-opacity duration-300", isFadingOut && "opacity-0")}>
              <span className="text-[7px] font-medium text-center leading-tight block adaptive-shadow break-words"
                style={{ 
                  ...plainTextStyle,
                  maxWidth: '42px', 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical' as const, 
                  overflow: 'hidden' 
                }}>
                {airlineName}
              </span>
            </div>
          ) : (
            <AirlineIcon
              flightId={flight.flightId}
              airlineCode={flight.airlineCode}
              cardStyle={settings.cardStyle}
              status={flight.status}
              logoFilter={logoFilter}
            />
          )}
        </button>

        {/* CENTER: Flight ID + Origin (same row, origin bold) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm leading-tight truncate adaptive-shadow"
            style={textStyle}>
            {flight.flightId}
          </span>
          <span className="font-bold text-sm truncate leading-tight adaptive-shadow"
            style={textStyle}>
            {flight.origin}
          </span>
        </div>

        {/* RIGHT: Multi-layered pill container */}
        <div
          className="flex items-center gap-0 flex-shrink-0 rounded-full overflow-hidden transition-all duration-500 ease-out glass-pill"
          style={{
            background: `rgba(${hexToRgb(theme.cardTint)}, ${hasStatus ? 0.12 : 0.06})`,
            border: `1px solid rgba(${hexToRgb(theme.cardTint)}, ${hasStatus ? 0.2 : 0.1})`,
            boxShadow: hasStatus
              ? `0 0 12px rgba(${hexToRgb(theme.cardTint)}, 0.2), inset 0 1px 2px rgba(255,255,255,0.08), inset 0 -1px 3px rgba(0,0,0,0.2)`
              : `inset 0 1px 2px rgba(255,255,255,0.06), inset 0 -1px 3px rgba(0,0,0,0.15)`,
          }}
        >
          {hasStatus && (
            <span
              className="text-[8px] font-semibold uppercase tracking-wide px-2 py-1.5 whitespace-nowrap status-badge-enter adaptive-shadow"
              style={textStyle}
            >
              {getStatusText()}
            </span>
          )}

          {hasStatus && !isExpanded && (
            <div className="w-px h-3 flex-shrink-0" style={{ background: `rgba(${hexToRgb(theme.textColor)}, 0.2)` }} />
          )}

          <div
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{
              maxWidth: isExpanded ? '0px' : '80px',
              opacity: isExpanded ? 0 : 1,
              padding: isExpanded ? '0' : undefined,
            }}
          >
            <span
              className="text-[10px] font-medium px-2 py-1.5 whitespace-nowrap block adaptive-shadow"
              style={textStyle}
            >
              {estimatedTimeFormatted}
            </span>
          </div>

          {showBell && (hasStatus || !isExpanded) && (
            <div className="w-px h-3 flex-shrink-0" style={{ background: `rgba(${hexToRgb(theme.textColor)}, 0.2)` }} />
          )}

          {showBell && (
            <div className="px-1.5 py-1 flex-shrink-0">
              <BellButton
                isActive={isNotificationEnabled}
                isSubscribing={isSubscribing}
                bellColor={theme.bellColor}
                bellGlow={theme.bellGlow}
                onClick={handleBellClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded bottom: SCH time | tracker | EST time */}
      {isExpanded && (
        <div className="flex items-center gap-1.5 px-2.5 pb-2.5 animate-fade-in" style={{ height: '28px' }}>
          <div className="flex flex-col items-start flex-shrink-0">
            <span className="text-[7px] uppercase tracking-wide adaptive-shadow" style={{ ...plainTextStyle, opacity: 0.6 }}>SCH</span>
            <span className="font-bold text-[9px] whitespace-nowrap adaptive-shadow" style={{ ...plainTextStyle, opacity: 0.8 }}>
              {scheduledTimeFormatted}
            </span>
          </div>

          <div className="flex-1 relative">
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
              showCountdownInline={true}
              centerText={(isLanded || isCancelled) ? estimatedTimeFormatted : undefined}
              forceVisible={isLanded || isCancelled}
            />
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-[7px] uppercase tracking-wide adaptive-shadow" style={{ ...plainTextStyle, opacity: 0.6 }}>EST</span>
            <span className="font-bold text-[9px] whitespace-nowrap adaptive-shadow" style={{ ...plainTextStyle, opacity: 0.8 }}>
              {estimatedTimeFormatted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Bell button component
const BellButton = ({ isActive, isSubscribing, bellColor, bellGlow, onClick }: {
  isActive: boolean; isSubscribing: boolean; bellColor: string; bellGlow: string; onClick: () => void;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={isSubscribing}
    className={cn("p-0.5 rounded-full flex-shrink-0 transition-all duration-300 bell-button glass-orb", isSubscribing && "opacity-50")}
    style={{
      boxShadow: isActive ? `0 0 12px ${bellGlow}, 0 0 20px ${bellGlow}` : 'none',
      opacity: isActive ? 1 : 0.5,
      background: isActive ? `rgba(${hexToRgb(bellColor)}, 0.15)` : 'transparent',
    }}
  >
    {isActive ? (
      <BellRing className="w-3 h-3" style={{ color: bellColor, filter: `drop-shadow(0 0 8px ${bellColor})` }} />
    ) : (
      <Bell className="w-3 h-3" style={{ color: bellColor, opacity: 0.65, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
    )}
  </button>
);

export default FlightCard;
