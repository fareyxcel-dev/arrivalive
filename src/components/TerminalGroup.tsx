import { useState, useMemo, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
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
  
  // Sort flights within each date: LANDED flights first, then by scheduled time
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => {
      const aLanded = a.status.toUpperCase() === 'LANDED' ? 0 : 1;
      const bLanded = b.status.toUpperCase() === 'LANDED' ? 0 : 1;
      
      if (aLanded !== bLanded) {
        return aLanded - bLanded;
      }
      
      const timeA = a.scheduledTime.replace(':', '');
      const timeB = b.scheduledTime.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });
  });

  return grouped;
};

// Format date as "18 Dec, Wednesday"
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00+05:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${month}, ${weekday}`;
};

const TerminalGroup = forwardRef<HTMLDivElement, Props>(({ terminal, flights, notificationIds, onToggleNotification }, ref) => {
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groupedFlights = useMemo(() => groupFlightsByDate(flights), [flights]);
  const dates = Object.keys(groupedFlights).sort();

  // Calculate terminal stats from date groups
  const terminalStats = useMemo(() => {
    let total = 0;
    let landed = 0;
    let cancelled = 0;
    
    Object.values(groupedFlights).forEach(dateFlights => {
      total += dateFlights.length;
      landed += dateFlights.filter(f => f.status.toUpperCase().includes('LANDED')).length;
      cancelled += dateFlights.filter(f => f.status.toUpperCase().includes('CANCELLED')).length;
    });
    
    return {
      total,
      landed,
      cancelled,
      remaining: total - landed - cancelled
    };
  }, [groupedFlights]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
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
        return 'International Terminal 1';
      case 'T2':
        return 'International Terminal 2';
      case 'DOM':
        return 'Domestic Terminal';
      default:
        return t;
    }
  };

  return (
    <div 
      ref={ref}
      className={cn(
        "terminal-group transition-all duration-300",
        isExpanded ? "bg-white/[0.08]" : "bg-white/[0.02]"
      )} 
      style={{ fontFamily: settings.fontFamily }}
    >
      {/* Terminal Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-lg font-bold text-white">
            {getTerminalName(terminal)}
          </h2>
          <p className="text-xs text-white/60 uppercase tracking-wider">
            {terminalStats.total} FLIGHTS · {terminalStats.remaining} REMAINING · {terminalStats.landed} LANDED
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {dates.length === 0 ? (
            <p className="text-center text-white/50 py-8">
              No flights scheduled
            </p>
          ) : (
            dates.map(date => {
              const dateFlights = groupedFlights[date];
              const totalCount = dateFlights.length;
              const dateLandedCount = dateFlights.filter(f => f.status.toUpperCase().includes('LANDED')).length;
              const dateCancelledCount = dateFlights.filter(f => f.status.toUpperCase().includes('CANCELLED')).length;
              const remainingCount = totalCount - dateLandedCount - dateCancelledCount;
              const isDateExpanded = expandedDates.has(date);
              
              return (
                <div key={date} className="space-y-2">
                  {/* Date Pill - compact single row */}
                  <button
                    onClick={() => toggleDate(date)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all",
                      isDateExpanded 
                        ? "bg-white/15 border border-white/20" 
                        : "bg-white/[0.03] hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="font-medium text-white/90 text-sm">
                      {formatDateDisplay(date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col">
                        <span className="text-[10px] text-white/70">
                          {totalCount} flights
                        </span>
                        <span className="text-[9px] text-white/50">
                          {dateLandedCount} Landed · {dateCancelledCount} Cancelled · {remainingCount} Remaining
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-white/50 transition-transform duration-300",
                          isDateExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* Flights for this date */}
                  {isDateExpanded && (
                    <div className="space-y-1.5 pl-1">
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
});

TerminalGroup.displayName = 'TerminalGroup';

export default TerminalGroup;
