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
  
  // Get airline name for full filename format: "EK (Emirates).png"
  const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
  const filename = `${airlineCode} (${airlineName}).png`;
  const logoUrl = `https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/${encodeURIComponent(filename)}`;
  const colorFilter = getColorFilter(color);
  
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
        src={logoUrl}
        alt={airlineName}
        className="max-w-[48px] max-h-[24px] object-contain"
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
      className="rounded-xl p-3 backdrop-blur-md"
      style={{ 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* TOP SECTION - Compact 2 Rows */}
      <div className="flex gap-2.5 items-center">
        {/* Airline Logo - Transparent Container */}
        <button
          onClick={handleLogoClick}
          className="w-12 h-9 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300"
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
                className="text-[7px] font-medium text-center leading-tight block"
                style={{ color: theme.textColor }}
              >
                {airlineName}
              </span>
            </div>
          ) : (
            <AirlineIcon airlineCode={flight.airlineCode} color={theme.textColor} />
          )}
        </button>

        {/* Separator */}
        <span className="text-lg font-light opacity-40 flex-shrink-0" style={{ color: theme.textColor }}>|</span>

        {/* Flight Info + Status/Bell */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Row 1: Flight Number + Status Badge OR Bell */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm leading-none" style={{ color: theme.textColor }}>
              {flight.flightId}
            </span>
            
            {showStatusBadge && (
              <div 
                className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                style={{ 
                  backgroundColor: theme.statusBg,
                  color: theme.textColor,
                  border: `1px solid ${theme.textColor}30`
                }}
              >
                {flight.status}
              </div>
            )}
            
            {showBellRow1 && (
              <button
                onClick={() => onToggleNotification(flight.id)}
                className={cn(
                  "p-1 rounded-full flex-shrink-0",
                  isNotificationEnabled ? "active-selection" : "hover:bg-white/10"
                )}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-3.5 h-3.5" style={{ color: theme.textColor }} />
                ) : (
                  <Bell className="w-3.5 h-3.5" style={{ color: theme.textColor }} />
                )}
              </button>
            )}
          </div>
          
          {/* Row 2: Origin + Bell (for delayed) */}
          <div className="flex items-center justify-between -mt-0.5">
            <span className="text-xs truncate opacity-80 leading-none" style={{ color: theme.textColor }}>
              {flight.origin}
            </span>
            
            {showBellRow2 && (
              <button
                onClick={() => onToggleNotification(flight.id)}
                className={cn(
                  "p-0.5 rounded-full flex-shrink-0",
                  isNotificationEnabled ? "active-selection" : "hover:bg-white/10"
                )}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-3 h-3" style={{ color: theme.textColor }} />
                ) : (
                  <Bell className="w-3 h-3" style={{ color: theme.textColor }} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="mt-2">
        {/* Labels with countdown */}
        <div className="flex items-center justify-between text-[10px] mb-0.5" style={{ color: `${theme.textColor}70` }}>
          <span>Scheduled</span>
          {showProgressBar && countdown && (
            <span className="text-[10px] font-medium" style={{ color: theme.textColor }}>
              {countdown}
            </span>
          )}
          <span>Estimated</span>
        </div>
        
        {/* Times + Progress Bar */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs flex-shrink-0 w-14 text-left" style={{ color: theme.textColor }}>
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
          
          <span className="font-semibold text-xs flex-shrink-0 w-14 text-right" style={{ color: theme.textColor }}>
            {estimatedTimeFormatted}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
