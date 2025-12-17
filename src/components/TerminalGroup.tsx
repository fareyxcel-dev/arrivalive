import { useState, useMemo } from 'react';
import { ChevronDown, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
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

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00+05:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const TerminalGroup = ({ terminal, flights, notificationIds, onToggleNotification }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groupedFlights = useMemo(() => groupFlightsByDate(flights), [flights]);
  const dates = Object.keys(groupedFlights).sort(); // Sort dates chronologically (YYYY-MM-DD format)

  const upcomingCount = flights.filter(f => f.status === '-').length;
  const landedCount = flights.filter(f => f.status.toUpperCase() === 'LANDED').length;

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
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
            <Plane className="w-5 h-5 text-foreground -rotate-45" />
          </div>
          <div className="text-left">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">
              {getTerminalName(terminal)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {flights.length} FLIGHTS · {upcomingCount} UPCOMING · {landedCount} LANDED
            </p>
          </div>
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
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          {dates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No flights scheduled
            </p>
          ) : (
            dates.map(date => {
              const dateFlights = groupedFlights[date];
              const totalCount = dateFlights.length;
              const landedCount = dateFlights.filter(f => f.status.toUpperCase() === 'LANDED').length;
              const remainingCount = totalCount - landedCount;
              
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
                    <span className="font-medium">{formatDateDisplay(date)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {totalCount} flights, {landedCount} landed, {remainingCount} remaining
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
