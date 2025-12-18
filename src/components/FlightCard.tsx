import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

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
}

interface Props {
  flight: Flight;
  isNotificationEnabled: boolean;
  onToggleNotification: (flightId: string) => void;
}

// ImageKit logo filenames (IATA code → exact filename)
const AIRLINE_LOGO_FILES: Record<string, string> = {
  '3U': '3U (Sichuan Airlines).png',
  '4Y': '4Y (Discover Airlines).png',
  '6E': '6E (IndiGo).png',
  '8D': '8D (FitsAir).png',
  'AF': 'AF (Air France).png',
  'AI': 'AI (Air India).png',
  'AK': 'AK (Air Asia).png',
  'AZ': 'AZ (ITA Airways).png',
  'B4': 'B4 (beOnd).png',
  'BA': 'BA (British Airways).png',
  'BS': 'BS (US-Bangla Airlines).png',
  'DE': 'DE (Condor).png',
  'EK': 'EK (Emirates).png',
  'EY': 'EY (Etihad Airways).png',
  'FD': 'FD (Thai AirAsia).png',
  'FZ': 'FZ (FlyDubai).png',
  'G9': 'G9 (Air Arabia).png',
  'GF': 'GF (Gulf Air).png',
  'HX': 'HX (Hong Kong Airlines).png',
  'HY': 'HY (Uzbekistan Airways).png',
  'IB': 'IB (Iberia).png',
  'J2': 'J2 (Azerbaijan Airlines).png',
  'J9': 'J9 (Jazeera Airways).png',
  'JD': 'JD (Beijing Capital Airlines).png',
  'KC': 'KC (Air Astana).png',
  'KU': 'KU (Kuwait Airways).png',
  'LO': 'LO (LOT Polish Airlines).png',
  'MH': 'MH (Malaysia Airlines).png',
  'MU': 'MU (China Eastern Airlines).png',
  'NO': 'NO (Neos).png',
  'NR': 'NR (MantaAir).png',
  'OD': 'OD (Batik Air Malaysia).png',
  'OS': 'OS (Austrian Airlines).png',
  'PG': 'PG (Bangkok Airways).png',
  'Q2': 'Q2 (Maldivian).png',
  'QR': 'QR (Qatar Airways).png',
  'SH': 'SH (FlyMe).png',
  'SQ': 'SQ (Singapore Airlines).png',
  'SU': 'SU (Aeroflot).png',
  'SV': 'SV (Saudia).png',
  'TK': 'TK (Turkish Airlines).png',
  'UL': 'UL (SriLankan Airlines).png',
  'VP': 'VP (VillaAir).png',
  'VS': 'VS (Virgin Atlantic).png',
  'W6': 'W6 (Wizz Air).png',
  'WK': 'WK (Edelweiss Air).png',
  'WY': 'WY (Oman Air).png',
  'XY': 'XY (Flynas).png',
  'ZF': 'ZF (Azur Air).png',
};

// Airline name mapping
const AIRLINE_NAMES: Record<string, string> = {
  '3U': 'Sichuan Airlines',
  '4Y': 'Discover Airlines',
  '6E': 'IndiGo',
  '8D': 'FitsAir',
  'AF': 'Air France',
  'AI': 'Air India',
  'AK': 'AirAsia',
  'AZ': 'ITA Airways',
  'B4': 'beOnd',
  'BA': 'British Airways',
  'BS': 'US-Bangla Airlines',
  'DE': 'Condor',
  'EK': 'Emirates',
  'EY': 'Etihad Airways',
  'FD': 'Thai AirAsia',
  'FZ': 'FlyDubai',
  'G9': 'Air Arabia',
  'GF': 'Gulf Air',
  'HX': 'Hong Kong Airlines',
  'HY': 'Uzbekistan Airways',
  'IB': 'Iberia',
  'J2': 'Azerbaijan Airlines',
  'J9': 'Jazeera Airways',
  'JD': 'Beijing Capital Airlines',
  'KC': 'Air Astana',
  'KU': 'Kuwait Airways',
  'LO': 'LOT Polish Airlines',
  'MH': 'Malaysia Airlines',
  'MU': 'China Eastern Airlines',
  'NO': 'Neos',
  'NR': 'MantaAir',
  'OD': 'Batik Air Malaysia',
  'OS': 'Austrian Airlines',
  'PG': 'Bangkok Airways',
  'Q2': 'Maldivian',
  'QR': 'Qatar Airways',
  'SH': 'FlyMe',
  'SQ': 'Singapore Airlines',
  'SU': 'Aeroflot',
  'SV': 'Saudia',
  'TK': 'Turkish Airlines',
  'UL': 'SriLankan Airlines',
  'VP': 'VillaAir',
  'VS': 'Virgin Atlantic',
  'W6': 'Wizz Air',
  'WK': 'Edelweiss Air',
  'WY': 'Oman Air',
  'XY': 'Flynas',
  'ZF': 'Azur Air',
};

const getStatusClass = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DELAYED':
      return 'glass-delayed';
    case 'LANDED':
      return 'glass-landed';
    case 'CANCELLED':
      return 'glass-cancelled';
    default:
      return 'glass';
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DELAYED':
      return 'status-badge-delayed';
    case 'LANDED':
      return 'status-badge-landed';
    case 'CANCELLED':
      return 'status-badge-cancelled';
    default:
      return '';
  }
};

const getTextColorClass = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DELAYED':
      return 'text-delayed';
    case 'LANDED':
      return 'text-landed';
    case 'CANCELLED':
      return 'text-cancelled';
    default:
      return 'text-foreground';
  }
};

const getLogoColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DELAYED':
      return '#fd7e01';
    case 'LANDED':
      return '#25fce8';
    case 'CANCELLED':
      return '#e9264d';
    default:
      return '#DCE0DE';
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

// Get logo URL from ImageKit
const getAirlineLogoUrl = (airlineCode: string) => {
  const filename = AIRLINE_LOGO_FILES[airlineCode];
  if (filename) {
    return `https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/${encodeURIComponent(filename)}`;
  }
  return null;
};

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const logoColor = getLogoColor(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  const airlineLogoUrl = getAirlineLogoUrl(flight.airlineCode);
  const isLanded = flight.status.toUpperCase() === 'LANDED';

  // Handle logo click with auto-fadeout
  const handleLogoClick = () => {
    if (showAirlineName) return;
    
    setShowAirlineName(true);
    setIsFadingOut(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduledTimeFormatted = formatTime(flight.scheduledTime, settings.timeFormat);
  const estimatedTimeFormatted = formatTime(flight.estimatedTime, settings.timeFormat);

  return (
    <div className={cn("flight-card", getStatusClass(flight.status))}>
      {/* Top Row: Logo, Flight Info, Status Badge, Bell */}
      <div className="flex items-center gap-3">
        {/* Expanded Logo */}
        <button
          onClick={handleLogoClick}
          className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 relative"
          style={{ 
            backgroundColor: `${logoColor}15`,
            border: `1px solid ${logoColor}30`
          }}
        >
          {showAirlineName ? (
            <span 
              className={cn(
                "text-[8px] font-medium text-center px-0.5 leading-tight transition-all duration-500",
                isFadingOut && "opacity-0 blur-sm"
              )}
              style={{ color: logoColor }}
            >
              {airlineName}
            </span>
          ) : logoError || !airlineLogoUrl ? (
            <Plane 
              className="w-6 h-6 -rotate-45" 
              style={{ color: logoColor }}
            />
          ) : (
            <img 
              src={airlineLogoUrl}
              alt={`${flight.airlineCode} logo`}
              className={cn(
                "w-10 h-10 object-contain transition-all duration-500",
                showAirlineName && "blur-sm opacity-0"
              )}
              style={{ 
                filter: `brightness(0) saturate(100%) drop-shadow(0 0 2px ${logoColor})`,
              }}
              onError={() => setLogoError(true)}
              onLoad={(e) => {
                // Apply color tint after load
                const img = e.currentTarget;
                img.style.filter = `brightness(0) saturate(100%)`;
                // Use CSS filter to colorize
                const hue = flight.status.toUpperCase() === 'DELAYED' ? 'sepia(100%) saturate(500%) hue-rotate(-10deg)' :
                            flight.status.toUpperCase() === 'LANDED' ? 'sepia(100%) saturate(500%) hue-rotate(130deg)' :
                            flight.status.toUpperCase() === 'CANCELLED' ? 'sepia(100%) saturate(500%) hue-rotate(-40deg)' :
                            'brightness(0) invert(1)';
                img.style.filter = hue;
              }}
            />
          )}
        </button>

        {/* Flight ID & Origin */}
        <div className="flex flex-col flex-1 min-w-0">
          <span 
            className={cn("font-bold text-base", getTextColorClass(flight.status))}
            style={{ fontFamily: settings.fontFamily }}
          >
            {flight.flightId}
          </span>
          <span className={cn("text-sm truncate", getTextColorClass(flight.status))}>
            {flight.origin}
          </span>
        </div>

        {/* Status Badge - moved to right side */}
        {flight.status !== '-' && (
          <span className={cn("status-badge text-xs flex-shrink-0", getStatusBadgeClass(flight.status))}>
            {flight.status}
          </span>
        )}

        {/* Notification Bell - hidden if LANDED */}
        {!isLanded && (
          <button
            onClick={() => onToggleNotification(flight.id)}
            className={cn(
              "p-2 rounded-full transition-all duration-300 flex-shrink-0",
              isNotificationEnabled 
                ? "active-selection" 
                : "hover:bg-white/10"
            )}
            aria-label={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {isNotificationEnabled ? (
              <BellRing className="w-5 h-5 bell-active animate-pulse-soft" />
            ) : (
              <Bell className="w-5 h-5 bell-neutral" />
            )}
          </button>
        )}
      </div>

      {/* Time Info */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Scheduled</p>
          <p 
            className={cn("font-semibold", getTextColorClass(flight.status))}
            style={{ fontFamily: settings.fontFamily }}
          >
            {scheduledTimeFormatted}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Plane className={cn("w-4 h-4 mx-2 -rotate-45", getTextColorClass(flight.status))} />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Estimated</p>
          <p 
            className={cn("font-semibold", getTextColorClass(flight.status))}
            style={{ fontFamily: settings.fontFamily }}
          >
            {estimatedTimeFormatted}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
