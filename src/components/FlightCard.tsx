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
  const logoColor = getLogoColor(flight.status);
  const airlineName = AIRLINE_NAMES[flight.airlineCode] || flight.airlineCode;
  
  // ImageKit airline logo URL
  const airlineLogoUrl = `https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/${flight.airlineCode}.svg`;

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
            ) : (
              <img 
                src={airlineLogoUrl}
                alt={`${flight.airlineCode} logo`}
                className="w-10 h-10 object-contain transition-all duration-300"
                style={{ 
                  filter: `brightness(0) saturate(100%) drop-shadow(0 0 1px ${logoColor})`,
                  // SVG colorization via CSS filter approximation
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 -rotate-45"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
                }}
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
