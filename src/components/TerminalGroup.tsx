import { useState, useMemo } from 'react';
import { ChevronDown, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightCard, { Flight } from './FlightCard';

interface Props {
  terminal: string;
  flights: Flight[];
  notificationIds: Set<string>;
  onToggleNotification: (flightId: string) => void;
}

// Group flights by their actual date field from the database
const groupFlightsByDate = (flights: Flight[]) => {
  const grouped: Record<string, Flight[]> = {};
  
  flights.forEach(flight => {
    const date = flight.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(flight);
  });
  
  // Sort flights within each date by scheduled time
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => {
      const timeA = a.scheduledTime.replace(':', '');
      const timeB = b.scheduledTime.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });
  });

  return grouped;
};

// Format date as "18 Dec - Wednesday"
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00+05:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${month} - ${weekday}`;
};

const TerminalGroup = ({ terminal, flights, notificationIds, onToggleNotification }: Props) => {
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'landing' | 'takeoff' | null>(null);

  const groupedFlights = useMemo(() => groupFlightsByDate(flights), [flights]);
  const dates = Object.keys(groupedFlights).sort();

  // Calculate terminal stats from date groups
  const terminalStats = useMemo(() => {
    let total = 0;
    let landed = 0;
    
    Object.values(groupedFlights).forEach(dateFlights => {
      total += dateFlights.length;
      landed += dateFlights.filter(f => 
        f.status.toUpperCase().includes('LANDED')
      ).length;
    });
    
    return {
      total,
      landed,
      remaining: total - landed
    };
  }, [groupedFlights]);

  const handleToggleExpand = () => {
    if (isExpanded) {
      setAnimationType('takeoff');
      setIsAnimating(true);
      setTimeout(() => {
        setIsExpanded(false);
        setIsAnimating(false);
        setAnimationType(null);
      }, 400);
    } else {
      setIsExpanded(true);
      setAnimationType('landing');
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationType(null);
      }, 500);
    }
  };

  const toggleDate = (date: string) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) {
      newExpandedDates.delete(date);
    } else {
      newExpandedDates.add(date);
    }
    setExpandedDates(newExpandedDates);
  };

  const getTerminalName = (t: string) => {
    switch (t) {
      case 'T1':
        return 'Terminal 1';
      case 'T2':
        return 'Terminal 2';
      case 'DOM':
        return 'Domestic Terminal';
      default:
        return t;
    }
  };

  return (
    <div className="terminal-group">
      {/* Terminal Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors relative overflow-hidden"
      >
        {/* Animated plane behind terminal name */}
        {(isExpanded || isAnimating) && (
          <div 
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none",
              animationType === 'landing' && "plane-landing",
              animationType === 'takeoff' && "plane-takeoff",
              !isAnimating && isExpanded && "opacity-30"
            )}
          >
            <Plane className="w-8 h-8 text-foreground -rotate-45" />
          </div>
        )}

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
            {/* Empty placeholder where plane icon was */}
            <span 
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: settings.fontFamily }}
            >
              {terminal}
            </span>
          </div>
          <div className="text-left">
            <h2 
              className="text-lg font-bold text-foreground uppercase tracking-wider"
              style={{ fontFamily: settings.fontFamily }}
            >
              {getTerminalName(terminal)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {terminalStats.total} FLIGHTS · {terminalStats.remaining} REMAINING · {terminalStats.landed} LANDED
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300 z-10",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          {dates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No flights scheduled
            </p>
          ) : (
            dates.map(date => {
              const dateFlights = groupedFlights[date];
              const totalCount = dateFlights.length;
              const dateLandedCount = dateFlights.filter(f => f.status.toUpperCase().includes('LANDED')).length;
              const remainingCount = totalCount - dateLandedCount;
              
              return (
                <div key={date} className="space-y-3">
                  {/* Date Pill */}
                  <button
                    onClick={() => toggleDate(date)}
                    className={cn(
                      "date-pill flex items-center justify-between w-full",
                      expandedDates.has(date) && "active-selection"
                    )}
                  >
                    <span 
                      className="font-medium"
                      style={{ fontFamily: settings.fontFamily }}
                    >
                      {formatDateDisplay(date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {totalCount} flights, {dateLandedCount} landed, {remainingCount} remaining
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-300",
                          expandedDates.has(date) && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                {/* Flights for this date */}
                {expandedDates.has(date) && (
                  <div className="space-y-3 pl-2 animate-slide-up">
                    {groupedFlights[date].map(flight => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        isNotificationEnabled={notificationIds.has(flight.id)}
                        onToggleNotification={onToggleNotification}
                      />
                    ))}
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TerminalGroup;
