import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightProgressBar from './FlightProgressBar';

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
  'AF': 'Air France', 'AI': 'Air India', 'AK': 'AirAsia', 'AZ': 'ITA Airways',
  'B4': 'beOnd', 'BA': 'British Airways', 'BS': 'US-Bangla Airlines', 'DE': 'Condor',
  'EK': 'Emirates', 'EY': 'Etihad Airways', 'FD': 'Thai AirAsia', 'FZ': 'FlyDubai',
  'G9': 'Air Arabia', 'GF': 'Gulf Air', 'HX': 'Hong Kong Airlines', 'HY': 'Uzbekistan Airways',
  'IB': 'Iberia', 'J2': 'Azerbaijan Airlines', 'J9': 'Jazeera Airways', 'JD': 'Beijing Capital Airlines',
  'KC': 'Air Astana', 'KU': 'Kuwait Airways', 'LO': 'LOT Polish Airlines', 'MH': 'Malaysia Airlines',
  'MU': 'China Eastern Airlines', 'NO': 'Neos', 'NR': 'MantaAir', 'OD': 'Batik Air Malaysia',
  'OS': 'Austrian Airlines', 'PG': 'Bangkok Airways', 'Q2': 'Maldivian', 'QR': 'Qatar Airways',
  'SH': 'FlyMe', 'SQ': 'Singapore Airlines', 'SU': 'Aeroflot', 'SV': 'Saudia',
  'TK': 'Turkish Airlines', 'UL': 'SriLankan Airlines', 'VP': 'VillaAir', 'VS': 'Virgin Atlantic',
  'W6': 'Wizz Air', 'WK': 'Edelweiss Air', 'WY': 'Oman Air', 'XY': 'Flynas', 'ZF': 'Azur Air',
};

// Status-based theme colors with subtle live blur tints
const getStatusTheme = (status: string) => {
  switch (status.toUpperCase()) {
    case 'LANDED':
      return {
        cardBg: 'rgba(16, 232, 185, 0.08)',
        cardBorder: 'rgba(16, 232, 185, 0.2)',
        trackInactive: '#0f6955',
        trackActive: '#30c2a2',
        textColor: '#81f0d8',
        statusBg: 'rgba(16, 232, 185, 0.15)',
        filterHue: '160deg',
      };
    case 'DELAYED':
      return {
        cardBg: 'rgba(235, 82, 12, 0.08)',
        cardBorder: 'rgba(235, 82, 12, 0.2)',
        trackInactive: '#a1441a',
        trackActive: '#c25e30',
        textColor: '#f2763d',
        statusBg: 'rgba(235, 82, 12, 0.15)',
        filterHue: '20deg',
      };
    case 'CANCELLED':
      return {
        cardBg: 'rgba(191, 15, 36, 0.08)',
        cardBorder: 'rgba(191, 15, 36, 0.2)',
        trackInactive: '#5a0a15',
        trackActive: '#bf0f24',
        textColor: '#f7485d',
        statusBg: 'rgba(191, 15, 36, 0.15)',
        filterHue: '350deg',
      };
    default:
      return {
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        trackInactive: 'rgba(255, 255, 255, 0.1)',
        trackActive: 'rgba(255, 255, 255, 0.3)',
        textColor: '#dce0de',
        statusBg: 'rgba(255, 255, 255, 0.1)',
        filterHue: '0deg',
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
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calculate luminance for brightness adjustment
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const brightness = luminance * 100;
  
  // Calculate hue from RGB
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
  
  // Calculate saturation
  const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
  
  return `brightness(0) saturate(100%) invert(1) sepia(100%) saturate(${Math.max(100, saturation * 10)}%) hue-rotate(${hue}deg) brightness(${Math.max(80, brightness)}%)`;
};

// Airline Icon Component with color matching
const AirlineIcon = ({ airlineCode, color }: { airlineCode: string; color: string }) => {
  const [imageError, setImageError] = useState(false);
  
  // Updated ImageKit CDN URL for airline logos with IATA code naming
  const logoUrl = `https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/${airlineCode}.png`;
  const colorFilter = getColorFilter(color);
  
  if (imageError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span 
          className="text-xs font-semibold"
          style={{ color }}
        >
          {airlineCode}
        </span>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img 
        src={logoUrl}
        alt={airlineCode}
        className="max-w-[56px] max-h-[28px] object-contain transition-all duration-300"
        style={{ filter: colorFilter }}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState('');
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

  // Handle countdown updates from progress bar
  const handleCountdownChange = (newCountdown: string) => {
    setCountdown(newCountdown);
  };

  const scheduledTimeFormatted = formatTime(flight.scheduledTime, settings.timeFormat);
  const estimatedTimeFormatted = formatTime(flight.estimatedTime, settings.timeFormat);

  return (
    <div 
      className="flight-card-v2 rounded-xl p-4 backdrop-blur-md transition-all duration-300"
      style={{ 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* TOP SECTION - 2 Rows with no spacing */}
      <div className="flex gap-3">
        {/* Airline Logo Container - reduced height to match text rows */}
        <button
          onClick={handleLogoClick}
          className="w-16 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 relative"
          style={{ 
            backgroundColor: theme.statusBg,
            border: `1px solid ${theme.textColor}20`
          }}
        >
          {showAirlineName ? (
            <span 
              className={cn(
                "text-[8px] font-medium text-center px-1 leading-tight transition-all duration-500",
                isFadingOut && "opacity-0 blur-sm"
              )}
              style={{ color: theme.textColor }}
            >
              {airlineName}
            </span>
          ) : (
            <AirlineIcon airlineCode={flight.airlineCode} color={theme.textColor} />
          )}
        </button>

        {/* Flight Info + Status/Bell - 2 Rows with no gap */}
        <div className="flex-1 flex flex-col justify-center min-w-0 gap-0">
          {/* Row 1: Flight Number + Status Badge OR Bell */}
          <div className="flex items-center justify-between">
            <span 
              className="font-bold text-base leading-tight"
              style={{ color: theme.textColor }}
            >
              {flight.flightId}
            </span>
            
            {/* Status Badge (Row 1) */}
            {showStatusBadge && (
              <div 
                className="status-badge-v2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide relative overflow-hidden"
                style={{ 
                  backgroundColor: theme.statusBg,
                  color: theme.textColor,
                  border: `1px solid ${theme.textColor}30`
                }}
              >
                <span className="status-badge-text relative z-10">{flight.status}</span>
                <div className="status-ripple-v2" style={{ backgroundColor: theme.textColor }} />
              </div>
            )}
            
            {/* Bell Icon Only (Row 1) */}
            {showBellRow1 && (
              <button
                onClick={() => onToggleNotification(flight.id)}
                className={cn(
                  "p-1.5 rounded-full transition-all duration-300 flex-shrink-0",
                  isNotificationEnabled ? "active-selection" : "hover:bg-white/10"
                )}
                aria-label={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-4 h-4 bell-active-v2" style={{ color: theme.textColor }} />
                ) : (
                  <Bell className="w-4 h-4" style={{ color: theme.textColor }} />
                )}
              </button>
            )}
          </div>
          
          {/* Row 2: Origin + Bell (for delayed) - no spacing from Row 1 */}
          <div className="flex items-center justify-between">
            <span 
              className="text-sm truncate opacity-80 leading-tight"
              style={{ color: theme.textColor }}
            >
              {flight.origin}
            </span>
            
            {/* Bell Icon (Row 2) - only for delayed flights */}
            {showBellRow2 && (
              <button
                onClick={() => onToggleNotification(flight.id)}
                className={cn(
                  "p-1 rounded-full transition-all duration-300 flex-shrink-0",
                  isNotificationEnabled ? "active-selection" : "hover:bg-white/10"
                )}
                aria-label={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-3.5 h-3.5 bell-active-v2" style={{ color: theme.textColor }} />
                ) : (
                  <Bell className="w-3.5 h-3.5" style={{ color: theme.textColor }} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - 2 Rows */}
      <div className="mt-3 space-y-1">
        {/* Row 3: Labels with countdown in center */}
        <div className="flex items-center justify-between text-xs" style={{ color: `${theme.textColor}80` }}>
          <span>Scheduled Time</span>
          {showProgressBar && countdown && (
            <span 
              className="text-[11px] font-medium countdown-text-above"
              style={{ color: theme.textColor }}
            >
              {countdown}
            </span>
          )}
          <span>Estimated Time</span>
        </div>
        
        {/* Row 4: Times + Progress Bar */}
        <div className="flex items-center gap-2">
          {/* Scheduled Time */}
          <div className="text-left flex-shrink-0 min-w-[65px]">
            <span 
              className="font-semibold text-sm"
              style={{ color: theme.textColor }}
            >
              {scheduledTimeFormatted}
            </span>
          </div>
          
          {/* Flight Progress Bar */}
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
          
          {/* Estimated Time */}
          <div className="text-right flex-shrink-0 min-w-[65px]">
            <span 
              className="font-semibold text-sm"
              style={{ color: theme.textColor }}
            >
              {estimatedTimeFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
