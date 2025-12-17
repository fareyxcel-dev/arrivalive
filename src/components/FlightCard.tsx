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
  const logoColor = getLogoColor(flight.status);
  // Airline logo URL from fis.com.mv
  const airlineLogoUrl = `https://fis.com.mv/webfids/images/${flight.airlineCode.toLowerCase()}.gif`;

  return (
    <div className={cn("flight-card", getStatusClass(flight.status))}>
      <div className="flex items-start justify-between gap-4">
        {/* Airline Logo & Info */}
        <div className="flex items-center gap-3 flex-1">
          {/* Airline Logo */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ 
              backgroundColor: `${logoColor}20`,
              border: `1px solid ${logoColor}40`
            }}
          >
            <img 
              src={airlineLogoUrl}
              alt={`${flight.airlineCode} logo`}
              className="w-10 h-10 object-contain"
              style={{ filter: `drop-shadow(0 0 1px ${logoColor})` }}
              onError={(e) => {
                // Fallback to plane icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 -rotate-45"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("font-display font-bold text-lg", getTextColorClass(flight.status))}>
                {flight.flightId}
              </span>
              {flight.status !== '-' && (
                <span className={cn("status-badge", getStatusBadgeClass(flight.status))}>
                  {flight.status}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              From <span className="text-foreground">{flight.origin}</span>
            </p>
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

      {/* Time Info */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Scheduled</p>
          <p className={cn("font-display font-semibold", getTextColorClass(flight.status))}>
            {flight.scheduledTime}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="px-3 text-xs text-muted-foreground">→</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Estimated</p>
          <p className={cn("font-display font-semibold", getTextColorClass(flight.status))}>
            {flight.estimatedTime}
          </p>
        </div>
      </div>

      {/* Terminal Badge */}
      <div className="mt-3 flex justify-end">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-muted-foreground border border-white/10">
          {flight.terminal}
        </span>
      </div>
    </div>
  );
};

export default FlightCard;
