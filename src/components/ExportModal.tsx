import { useState, useEffect, useMemo } from 'react';
import { X, Download, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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

const STATUS_OPTIONS = ['all', 'scheduled', 'estimated', 'delayed', 'landed', 'cancelled'] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const ExportModal = ({ isOpen, onClose }: Props) => {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<'all' | 'T1' | 'T2' | 'DOM'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [originSearch, setOriginSearch] = useState('');
  const [historyFlights, setHistoryFlights] = useState<FlightRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHistoryFlights = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .gte('flight_date', sevenDaysAgo.toISOString().split('T')[0])
          .lte('flight_date', weekAhead.toISOString().split('T')[0])
          .order('flight_date', { ascending: false })
          .order('scheduled_time', { ascending: true });
        if (error) { console.error('Error fetching history:', error); return; }
        if (data) {
          setHistoryFlights(data);
          const uniqueDates = [...new Set(data.map(f => f.flight_date))].sort().reverse();
          setDates(uniqueDates);
          if (uniqueDates.length > 0 && !selectedDate) setSelectedDate(uniqueDates[0]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistoryFlights();
  }, [isOpen]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00+05:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${day} ${month} - ${weekday}`;
  };

  // Live filtered preview (also used for export)
  const filtered = useMemo(() => {
    let out = historyFlights;
    if (selectedDate) out = out.filter(f => f.flight_date === selectedDate);
    if (selectedTerminal !== 'all') out = out.filter(f => f.terminal === selectedTerminal);
    if (statusFilter !== 'all') {
      out = out.filter(f => (f.status || '').toLowerCase().includes(statusFilter));
    }
    const q = originSearch.trim().toLowerCase();
    if (q) {
      out = out.filter(f =>
        (f.origin || '').toLowerCase().includes(q) ||
        (f.flight_id || '').toLowerCase().includes(q) ||
        (f.airline_code || '').toLowerCase().includes(q)
      );
    }
    return [...out].sort((a, b) =>
      parseInt(a.scheduled_time.replace(':', '')) - parseInt(b.scheduled_time.replace(':', ''))
    );
  }, [historyFlights, selectedDate, selectedTerminal, statusFilter, originSearch]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error('No flights match your filters');
      return;
    }
    setIsExporting(true);
    try {
      // Yield so spinner paints before synchronous work
      await new Promise(r => setTimeout(r, 60));

      // Build typed rows for the XLSX sheet.
      // - flight_date as a real Date
      // - times as text "HH:mm"
      const rows = filtered.map(f => ({
        'Flight ID': f.flight_id,
        'Airline': f.airline_code || '',
        'Origin': f.origin,
        'Date': new Date(f.flight_date + 'T00:00:00'),
        'Scheduled Time': f.scheduled_time,
        'Estimated Time': f.estimated_time || f.scheduled_time,
        'Terminal': f.terminal,
        'Status': f.status,
      }));

      const ws = XLSX.utils.json_to_sheet(rows, {
        header: ['Flight ID', 'Airline', 'Origin', 'Date', 'Scheduled Time', 'Estimated Time', 'Terminal', 'Status'],
        cellDates: true,
      });

      // Column widths
      (ws as any)['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
      ];

      // Apply date format on column D (Date)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = 1; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ c: 3, r })];
        if (cell) { cell.t = 'd'; cell.z = 'yyyy-mm-dd'; }
      }

      const wb = XLSX.utils.book_new();
      const sheetName = `Arrivals ${selectedTerminal}`.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Filename includes date + terminal + optional status/search
      const parts = ['arriva-schedule', selectedDate || 'all', selectedTerminal];
      if (statusFilter !== 'all') parts.push(statusFilter);
      if (originSearch.trim()) parts.push(originSearch.trim().replace(/[^a-z0-9]+/gi, '-').slice(0, 20));
      const filename = parts.filter(Boolean).join('_') + '.xlsx';

      XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
      toast.success(`Exported ${filtered.length} flight${filtered.length === 1 ? '' : 's'}`);
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={isExporting ? undefined : onClose}
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <div
        className="rounded-2xl w-full max-w-sm overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px) saturate(1.2)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-foreground/70" />
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: settings.fontFamily }}>
              Export Schedule
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className={cn("p-4 space-y-3", isExporting && "pointer-events-none opacity-60")}>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Loading history...</div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Date</label>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  disabled={isExporting}
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none disabled:opacity-60"
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
                      disabled={isExporting}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm transition-colors disabled:opacity-60",
                        selectedTerminal === terminal ? "active-selection" : "glass hover:bg-white/10"
                      )}
                    >
                      {terminal === 'all' ? 'All' : terminal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                  disabled={isExporting}
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none capitalize disabled:opacity-60"
                  style={{ fontFamily: settings.fontFamily }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} className="bg-popover capitalize">{s === 'all' ? 'All statuses' : s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Search origin / flight</label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={originSearch}
                    onChange={e => setOriginSearch(e.target.value.slice(0, 60))}
                    disabled={isExporting}
                    placeholder="e.g. Dubai, EK, EK650"
                    className="w-full pl-9 pr-3 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none disabled:opacity-60 text-sm"
                    style={{ fontFamily: settings.fontFamily }}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-1">
                {filtered.length} flight{filtered.length === 1 ? '' : 's'} match current filters
              </div>

              <button
                onClick={handleExport}
                disabled={dates.length === 0 || isExporting || filtered.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg glass-interactive text-foreground font-medium transition-all hover:bg-white/30 active:scale-[0.98] disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Excel (.xlsx)
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
