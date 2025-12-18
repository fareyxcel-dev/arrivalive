import { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface FlightRecord {
  id: string;
  flight_id: string;
  origin: string;
  scheduled_time: string;
  estimated_time: string | null;
  terminal: string;
  status: string;
  flight_date: string;
  airline_code: string;
}

const ExportModal = ({ isOpen, onClose }: Props) => {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<'all' | 'T1' | 'T2' | 'DOM'>('all');
  const [historyFlights, setHistoryFlights] = useState<FlightRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistoryFlights = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekAhead = new Date(today);
        weekAhead.setDate(weekAhead.getDate() + 7);

        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .gte('flight_date', sevenDaysAgo.toISOString().split('T')[0])
          .lte('flight_date', weekAhead.toISOString().split('T')[0])
          .order('flight_date', { ascending: false })
          .order('scheduled_time', { ascending: true });

        if (error) {
          console.error('Error fetching history:', error);
          return;
        }

        if (data) {
          setHistoryFlights(data);
          const uniqueDates = [...new Set(data.map(f => f.flight_date))].sort().reverse();
          setDates(uniqueDates);
          if (uniqueDates.length > 0 && !selectedDate) {
            setSelectedDate(uniqueDates[0]);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryFlights();
  }, [isOpen]);

  if (!isOpen) return null;

  // Format date as "18 Dec - Wednesday"
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00+05:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${day} ${month} - ${weekday}`;
  };

  const handleExport = () => {
    let filteredFlights = historyFlights;

    if (selectedDate) {
      filteredFlights = filteredFlights.filter(f => f.flight_date === selectedDate);
    }

    if (selectedTerminal !== 'all') {
      filteredFlights = filteredFlights.filter(f => f.terminal === selectedTerminal);
    }

    // Sort flights for export (by scheduled time by default)
    filteredFlights.sort((a, b) => {
      const timeA = a.scheduled_time.replace(':', '');
      const timeB = b.scheduled_time.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });

    // Create CSV content WITHOUT date column, sortable columns
    const headers = ['Flight ID', 'Origin', 'Scheduled Time', 'Estimated Time', 'Terminal', 'Status'];
    const rows = filteredFlights.map(f => [
      f.flight_id,
      `"${f.origin}"`, // Quote origin in case of commas
      f.scheduled_time,
      f.estimated_time || f.scheduled_time,
      f.terminal,
      f.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arriva-schedule-${selectedDate || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-sm overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-foreground/70" />
            <h2 
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: settings.fontFamily }}
            >
              Export Schedule
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Loading history...</div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Date</label>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                  style={{ fontFamily: settings.fontFamily }}
                >
                  {dates.map(date => (
                    <option key={date} value={date} className="bg-popover">
                      {formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Terminal</label>
                <div className="flex gap-2 mt-2">
                  {(['all', 'T1', 'T2', 'DOM'] as const).map(terminal => (
                    <button
                      key={terminal}
                      onClick={() => setSelectedTerminal(terminal)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm transition-colors",
                        selectedTerminal === terminal ? "active-selection" : "glass hover:bg-white/10"
                      )}
                    >
                      {terminal === 'all' ? 'All' : terminal}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={dates.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg glass-interactive text-foreground font-medium transition-all hover:bg-white/30 active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
