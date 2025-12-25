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
      };
    case 'DELAYED':
      return {
        cardBg: 'rgba(235, 82, 12, 0.08)',
        cardBorder: 'rgba(235, 82, 12, 0.2)',
        trackInactive: '#a1441a',
        trackActive: '#c25e30',
        textColor: '#f2763d',
        statusBg: 'rgba(235, 82, 12, 0.15)',
      };
    case 'CANCELLED':
      return {
        cardBg: 'rgba(191, 15, 36, 0.08)',
        cardBorder: 'rgba(191, 15, 36, 0.2)',
        trackInactive: '#5a0a15',
        trackActive: '#bf0f24',
        textColor: '#f7485d',
        statusBg: 'rgba(191, 15, 36, 0.15)',
      };
    default:
      return {
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        trackInactive: 'rgba(255, 255, 255, 0.1)',
        trackActive: 'rgba(255, 255, 255, 0.3)',
        textColor: '#dce0de',
        statusBg: 'rgba(255, 255, 255, 0.1)',
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

// SVG Airline Icon Component (dynamic color matching text)
const AirlineIcon = ({ airlineCode, color }: { airlineCode: string; color: string }) => {
  // Use ImageKit CDN for airline logos
  const logoUrl = `https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/${airlineCode}.png`;
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img 
        src={logoUrl}
        alt={airlineCode}
        className="max-w-[60px] max-h-[40px] object-contain transition-all duration-300"
        style={{ 
          filter: `brightness(0) saturate(100%)`,
          // Apply color overlay using CSS
        }}
        onError={(e) => {
          // Fallback to text if image fails
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            parent.innerHTML = `<span style="color: ${color}; font-size: 14px; font-weight: 600;">${airlineCode}</span>`;
          }
        }}
      />
      {/* Color overlay for the logo */}
      <div 
        className="absolute inset-0 mix-blend-color pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const theme = getStatusTheme(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  const isLanded = flight.status.toUpperCase() === 'LANDED';
  const isCancelled = flight.status.toUpperCase() === 'CANCELLED';
  const isDelayed = flight.status.toUpperCase() === 'DELAYED';
  
  // Status/Bell logic:
  // - On-time (no status): Bell only
  // - Delayed: Status badge (row 1) + Bell (row 2)
  // - Landed/Cancelled: Status badge only (replaces bell permanently)
  const hasTerminalStatus = isLanded || isCancelled || isDelayed;
  const showStatusBadge = hasTerminalStatus;
  const showBellRow1 = !hasTerminalStatus; // Bell only in row 1 when no status
  const showBellRow2 = isDelayed; // Bell in row 2 only for delayed
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
      {/* TOP SECTION - 2 Rows */}
      <div className="flex gap-3">
        {/* Airline Logo Container (spans 2 rows) */}
        <button
          onClick={handleLogoClick}
          className="w-20 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 relative"
          style={{ 
            backgroundColor: theme.statusBg,
            border: `1px solid ${theme.textColor}20`
          }}
        >
          {showAirlineName ? (
            <span 
              className={cn(
                "text-[9px] font-medium text-center px-1 leading-tight transition-all duration-500",
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

        {/* Flight Info + Status/Bell - 2 Rows */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Row 1: Flight Number + Status Badge OR Bell */}
          <div className="flex items-center justify-between">
            <span 
              className="font-bold text-lg"
              style={{ color: theme.textColor }}
            >
              {flight.flightId}
            </span>
            
            {/* Status Badge (Row 1) - shown for landed, cancelled, or delayed */}
            {showStatusBadge && (
              <div 
                className="status-badge-v2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide relative overflow-hidden"
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
            
            {/* Bell Icon Only (Row 1) - shown when no status */}
            {showBellRow1 && (
              <button
                onClick={() => onToggleNotification(flight.id)}
                className={cn(
                  "p-2 rounded-full transition-all duration-300 flex-shrink-0",
                  isNotificationEnabled ? "active-selection" : "hover:bg-white/10"
                )}
                aria-label={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
              >
                {isNotificationEnabled ? (
                  <BellRing className="w-5 h-5 bell-active-v2" style={{ color: theme.textColor }} />
                ) : (
                  <Bell className="w-5 h-5" style={{ color: theme.textColor }} />
                )}
              </button>
            )}
          </div>
          
          {/* Row 2: Origin + Bell (for delayed) */}
          <div className="flex items-center justify-between">
            <span 
              className="text-sm truncate opacity-80"
              style={{ color: theme.textColor }}
            >
              {flight.origin}
            </span>
            
            {/* Bell Icon (Row 2) - only for delayed flights */}
            {showBellRow2 && (
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
        </div>
      </div>

      {/* BOTTOM SECTION - 2 Rows */}
      <div className="mt-4 space-y-2">
        {/* Row 3: Labels */}
        <div className="flex items-center justify-between text-xs" style={{ color: `${theme.textColor}80` }}>
          <span>Schedule Time</span>
          <span>Estimated Time</span>
        </div>
        
        {/* Row 4: Times + Progress Bar */}
        <div className="flex items-center gap-3">
          {/* Scheduled Time */}
          <div className="text-left flex-shrink-0 min-w-[70px]">
            <span 
              className="font-semibold text-base"
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
              />
            </div>
          )}
          
          {/* Estimated Time */}
          <div className="text-right flex-shrink-0 min-w-[70px]">
            <span 
              className="font-semibold text-base"
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
