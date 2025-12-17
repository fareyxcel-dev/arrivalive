import { useState } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Flight } from './FlightCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
}

const ExportModal = ({ isOpen, onClose, flights }: Props) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<'all' | 'T1' | 'T2' | 'DOM'>('all');

  if (!isOpen) return null;

  // Get unique dates
  const dates = [...new Set(flights.map(f => f.date))];
  
  // Set default date to today if available
  if (!selectedDate && dates.length > 0) {
    setSelectedDate(dates[0]);
  }

  const handleExport = () => {
    let filteredFlights = flights;

    if (selectedDate) {
      filteredFlights = filteredFlights.filter(f => f.date === selectedDate);
    }

    if (selectedTerminal !== 'all') {
      filteredFlights = filteredFlights.filter(f => f.terminal === selectedTerminal);
    }

    // Create CSV content
    const headers = ['Flight ID', 'Origin', 'Scheduled', 'Estimated', 'Terminal', 'Status', 'Date'];
    const rows = filteredFlights.map(f => [
      f.flightId,
      f.origin,
      f.scheduledTime,
      f.estimatedTime,
      f.terminal,
      f.status,
      f.date,
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
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Export Schedule</h2>
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
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Date</label>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-primary outline-none"
            >
              {dates.map(date => (
                <option key={date} value={date} className="bg-popover">
                  {date}
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
