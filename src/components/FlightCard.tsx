import { useState } from 'react';
import { Bell, BellRing, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Airline name mapping
const AIRLINE_NAMES: Record<string, string> = {
  '6E': 'IndiGo',
  'G9': 'Air Arabia',
  'Q2': 'Maldivian',
  'EY': 'Etihad Airways',
  'AK': 'AirAsia',
  'UL': 'SriLankan Airlines',
  'QR': 'Qatar Airways',
  'EK': 'Emirates',
  'FZ': 'Flydubai',
  'NR': 'Manta Air',
  'GF': 'Gulf Air',
  'SQ': 'Singapore Airlines',
  'MH': 'Malaysia Airlines',
  'VP': 'Villa Air',
  'TK': 'Turkish Airlines',
  'SU': 'Aeroflot',
  'BA': 'British Airways',
  'J2': 'Azerbaijan Airlines',
  'DE': 'Condor',
  'ZF': 'Azur Air',
  'VS': 'Virgin Atlantic',
  'KC': 'Air Astana',
  'FD': 'Thai AirAsia',
  'OS': 'Austrian Airlines',
  'WK': 'Edelweiss',
  '8D': 'FitsAir',
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

const FlightCard = ({ flight, isNotificationEnabled, onToggleNotification }: Props) => {
  const [showAirlineName, setShowAirlineName] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const logoColor = getLogoColor(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  
  // ImageKit airline logo URL - fallback to fis.com.mv
  const airlineLogoUrl = `https://fis.com.mv/webfids/images/${flight.airlineCode.toLowerCase()}.gif`;

  return (
    <div className={cn("flight-card", getStatusClass(flight.status))}>
      {/* Top Row: Logo, Flight ID, Status, Bell */}
      <div className="flex items-start justify-between gap-3">
        {/* Logo & Flight Info */}
        <div className="flex flex-col items-start gap-2 flex-1">
          {/* Clickable Logo */}
          <button
            onClick={() => setShowAirlineName(!showAirlineName)}
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 relative",
              showAirlineName && "backdrop-blur-xl"
            )}
            style={{ 
              backgroundColor: `${logoColor}15`,
              border: `1px solid ${logoColor}30`
            }}
          >
            {showAirlineName ? (
              <span 
                className="text-[10px] font-medium text-center px-1 leading-tight"
                style={{ color: logoColor }}
              >
                {airlineName}
              </span>
            ) : logoError ? (
              <Plane 
                className="w-6 h-6 -rotate-45" 
                style={{ color: logoColor }}
              />
            ) : (
              <img 
                src={airlineLogoUrl}
                alt={`${flight.airlineCode} logo`}
                className="w-10 h-10 object-contain transition-all duration-300"
                style={{ 
                  filter: `drop-shadow(0 0 1px ${logoColor})`,
                }}
                onError={() => setLogoError(true)}
              />
            )}
          </button>
          
          {/* Flight ID & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-display font-bold text-lg", getTextColorClass(flight.status))}>
              {flight.flightId}
            </span>
            {flight.status !== '-' && (
              <span className={cn("status-badge", getStatusBadgeClass(flight.status))}>
                {flight.status}
              </span>
            )}
          </div>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => onToggleNotification(flight.id)}
          className={cn(
            "p-2 rounded-full transition-all duration-300",
            isNotificationEnabled 
              ? "active-selection" 
              : "hover:bg-white/10"
          )}
          aria-label={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
        >
          {isNotificationEnabled ? (
            <BellRing className="w-5 h-5 text-primary animate-pulse-soft" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Origin */}
      <p className="text-sm text-muted-foreground mt-2">
        From <span className={cn("font-medium", getTextColorClass(flight.status))}>{flight.origin}</span>
      </p>

      {/* Time Info */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Scheduled</p>
          <p className={cn("font-display font-semibold", getTextColorClass(flight.status))}>
            {flight.scheduledTime}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Plane className={cn("w-4 h-4 mx-2 -rotate-45", getTextColorClass(flight.status))} />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Estimated</p>
          <p className={cn("font-display font-semibold", getTextColorClass(flight.status))}>
            {flight.estimatedTime}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
