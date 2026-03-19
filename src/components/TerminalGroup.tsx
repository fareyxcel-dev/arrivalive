import { useState, useMemo, forwardRef } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import FlightCard, { Flight } from './FlightCard';
import { UI_ICONS } from '@/lib/cardStyles';

interface Props {
  terminal: string;
  flights: Flight[];
  allFlights?: Flight[];
  notificationIds: Set<string>;
  onToggleNotification: (flightId: string) => void;
}

const groupFlightsByDate = (flights: Flight[]) => {
  const grouped: Record<string, Flight[]> = {};
  flights.forEach(flight => {
    const date = flight.date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(flight);
  });
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => {
      const aLanded = a.status.toUpperCase() === 'LANDED' ? 0 : 1;
      const bLanded = b.status.toUpperCase() === 'LANDED' ? 0 : 1;
      if (aLanded !== bLanded) return aLanded - bLanded;
      const timeA = a.scheduledTime.replace(':', '');
      const timeB = b.scheduledTime.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });
  });
  return grouped;
};

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00+05:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${month}, ${weekday}`;
};

const TerminalGroup = forwardRef<HTMLDivElement, Props>(({ terminal, flights, allFlights, notificationIds, onToggleNotification }, ref) => {
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Per-terminal local filter state
  const [hideCancelled, setHideCancelled] = useState(false);
  const [hideLanded, setHideLanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Use allFlights when showFull is active, otherwise use filtered flights
  const sourceFlights = showFull && allFlights ? allFlights : flights;

  // Apply per-terminal filters
  const visibleFlights = useMemo(() => {
    return sourceFlights.filter(f => {
      const statusUpper = f.status.toUpperCase();
      if (hideCancelled && statusUpper === 'CANCELLED') return false;
      if (hideLanded && statusUpper === 'LANDED') return false;
      return true;
    });
  }, [sourceFlights, hideCancelled, hideLanded]);

  const groupedFlights = useMemo(() => groupFlightsByDate(visibleFlights), [visibleFlights]);
  const dates = Object.keys(groupedFlights).sort();

  const terminalStats = useMemo(() => {
    let total = 0, landed = 0, cancelled = 0;
    Object.values(groupedFlights).forEach(dateFlights => {
      total += dateFlights.length;
      landed += dateFlights.filter(f => f.status.toUpperCase().includes('LANDED')).length;
      cancelled += dateFlights.filter(f => f.status.toUpperCase().includes('CANCELLED')).length;
    });
    return { total, landed, cancelled, remaining: total - landed - cancelled };
  }, [groupedFlights]);

  // Count total hidden flights across all dates in this terminal
  const totalHiddenCount = useMemo(() => {
    return sourceFlights.length - visibleFlights.length;
  }, [sourceFlights.length, visibleFlights.length]);

  const hasActiveFilters = hideCancelled || hideLanded || showFull;

  const toggleDate = (date: string) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) newExpandedDates.delete(date);
    else newExpandedDates.add(date);
    setExpandedDates(newExpandedDates);
  };

  const getTerminalLabel = (t: string) => {
    switch (t) {
      case 'T1': return 'International Terminal (T1)';
      case 'T2': return 'Domestic Terminal (T2)';
      case 'DOM': return 'Domestic Terminal';
      default: return t;
    }
  };

  const getTerminalIcon = (t: string) => {
    switch (t) {
      case 'T1': return UI_ICONS.t1;
      case 'T2': return UI_ICONS.t2;
      case 'DOM': return UI_ICONS.dom;
      default: return null;
    }
  };

  const terminalIcon = getTerminalIcon(terminal);

  return (
    <div
      ref={ref}
      className={cn("terminal-group transition-all duration-300", isExpanded ? "bg-white/[0.08]" : "bg-white/[0.02]")}
      style={{ fontFamily: settings.fontFamily }}
    >
      {/* Terminal Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="text-left flex-1 min-w-0 flex items-center gap-2">
          {terminalIcon && (
            <img src={terminalIcon} alt={getTerminalLabel(terminal)} className="w-6 h-6 object-contain flex-shrink-0" />
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{getTerminalLabel(terminal)}</h2>
            <p className="text-xs text-white/80 uppercase tracking-wider">
              {terminalStats.total} FLIGHTS · {terminalStats.remaining} REMAINING · {terminalStats.landed} LANDED
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filter pill - visible only when terminal is expanded */}
          {isExpanded && (
            <div
              className={cn(
                "flex items-center rounded-full transition-all duration-300 overflow-hidden border",
                isFilterOpen
                  ? "border-white/20 bg-white/[0.08] gap-1 px-1.5 py-1"
                  : "border-white/10 bg-white/[0.03] px-1.5 py-1",
                hasActiveFilters && !isFilterOpen && "border-white/25"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                className="flex items-center gap-1 flex-shrink-0"
              >
                <Filter className={cn("w-3 h-3", hasActiveFilters ? "text-white/90" : "text-white/80")} />
                {totalHiddenCount > 0 && !isFilterOpen && (
                  <span className="text-[8px] text-white/80 font-medium">{totalHiddenCount}</span>
                )}
              </button>

              {isFilterOpen && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHideCancelled(!hideCancelled); }}
                    className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded-full transition-all whitespace-nowrap",
                      !hideCancelled
                        ? "bg-white/15 text-white/80"
                        : "bg-white/[0.03] text-white/40 line-through"
                    )}
                  >
                    Cancelled
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHideLanded(!hideLanded); }}
                    className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded-full transition-all whitespace-nowrap",
                      !hideLanded
                        ? "bg-white/15 text-white/80"
                        : "bg-white/[0.03] text-white/40 line-through"
                    )}
                  >
                    Landed
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
                    className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded-full transition-all whitespace-nowrap",
                      showFull
                        ? "bg-white/20 text-white/90 font-semibold"
                        : "bg-white/[0.03] text-white/50"
                    )}
                  >
                    Full
                  </button>
                </>
              )}
            </div>
          )}

          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {dates.length === 0 ? (
            <p className="text-center text-white/80 py-8">No flights to show</p>
          ) : (
            dates.map(date => {
              const dateFlights = groupedFlights[date];
              const totalCount = dateFlights.length;
              const dateLandedCount = dateFlights.filter(f => f.status.toUpperCase().includes('LANDED')).length;
              const dateCancelledCount = dateFlights.filter(f => f.status.toUpperCase().includes('CANCELLED')).length;
              const remainingCount = totalCount - dateLandedCount - dateCancelledCount;
              const isDateExpanded = expandedDates.has(date);

              return (
                <div key={date} className="space-y-1.5">
                  {/* Date divider */}
                  <button
                    onClick={() => toggleDate(date)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all",
                      isDateExpanded ? "bg-white/15 border border-white/20" : "bg-white/[0.03] hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="font-medium text-white/90 text-sm">{formatDateDisplay(date)}</span>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col">
                        <span className="text-[10px] text-white/70">{totalCount} flights</span>
                        <span className="text-[9px] text-white/50">
                          {remainingCount} Remaining
                        </span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform duration-300", isDateExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isDateExpanded && (
                    <div className="space-y-1.5 pl-1">
                      {groupedFlights[date].map(flight => (
                        <FlightCard
                          key={flight.id}
                          flight={flight}
                          isNotificationEnabled={notificationIds.has(flight.flightId)}
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
