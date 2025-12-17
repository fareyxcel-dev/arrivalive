import { useState } from 'react';
import { ChevronDown, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import FlightCard, { Flight } from './FlightCard';

interface Props {
  terminal: string;
  flights: Flight[];
  notificationIds: Set<string>;
  onToggleNotification: (flightId: string) => void;
}

const groupFlightsByDate = (flights: Flight[]) => {
  const grouped: Record<string, Flight[]> = {};
  
  flights.forEach(flight => {
    if (!grouped[flight.date]) {
      grouped[flight.date] = [];
    }
    grouped[flight.date].push(flight);
  });

  return grouped;
};

const TerminalGroup = ({ terminal, flights, notificationIds, onToggleNotification }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groupedFlights = groupFlightsByDate(flights);
  const dates = Object.keys(groupedFlights);

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
            dates.map(date => (
              <div key={date} className="space-y-3">
                {/* Date Pill */}
                <button
                  onClick={() => toggleDate(date)}
                  className={cn(
                    "date-pill flex items-center justify-between w-full",
                    expandedDates.has(date) && "active-selection"
                  )}
                >
                  <span className="font-medium">{date}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {groupedFlights[date].length} flights
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TerminalGroup;
