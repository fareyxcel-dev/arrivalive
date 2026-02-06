import { useState, useEffect } from 'react';
import { X, Bug, Lightbulb, Check, Clock, Loader2, Shield, Settings, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Report {
  id: string;
  report_type: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface PendingFont {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
}

const AdminDashboard = ({ isOpen, onClose }: Props) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'fonts'>('overview');
  const [reportType, setReportType] = useState<'bug' | 'feature'>('bug');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingFonts, setPendingFonts] = useState<PendingFont[]>([]);
  const [stats, setStats] = useState({
    totalFlights: 0,
    activeSubscriptions: 0,
    pendingReports: 0,
    pendingFonts: 0,
  });

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const loadData = async () => {
    try {
      // Load stats
      const [flightsRes, subsRes, reportsRes, fontsRes] = await Promise.all([
        supabase.from('flights').select('id', { count: 'exact', head: true }),
        supabase.from('notification_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('admin_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('custom_fonts').select('*').eq('approved', false),
      ]);

      setStats({
        totalFlights: flightsRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        pendingReports: reportsRes.data?.filter(r => r.status === 'pending').length || 0,
        pendingFonts: fontsRes.data?.length || 0,
      });

      if (reportsRes.data) setReports(reportsRes.data);
      if (fontsRes.data) setPendingFonts(fontsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('admin_reports').insert({
        report_type: reportType,
        title: reportTitle,
        description: reportDescription || null,
        reported_by: user?.id,
      });

      if (error) throw error;

      toast.success('Report submitted successfully');
      setReportTitle('');
      setReportDescription('');
      loadData();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveFont = async (fontId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('custom_fonts')
        .update({ approved: true, approved_by: user?.id })
        .eq('id', fontId);

      if (error) throw error;

      toast.success('Font approved');
      loadData();
    } catch (error) {
      console.error('Error approving font:', error);
      toast.error('Failed to approve font');
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('admin_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Status updated');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px) saturate(1.2)', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: settings.fontFamily }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-foreground">Admin Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: Settings },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'fonts', label: 'Fonts', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-foreground/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalFlights}</p>
                  <p className="text-xs text-muted-foreground">Total Flights</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.activeSubscriptions}</p>
                  <p className="text-xs text-muted-foreground">Subscriptions</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.pendingReports}</p>
                  <p className="text-xs text-muted-foreground">Pending Reports</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.pendingFonts}</p>
                  <p className="text-xs text-muted-foreground">Pending Fonts</p>
                </div>
              </div>

              {/* Submit Report Form */}
              <div className="glass rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground">Submit Report</h3>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportType('bug')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors",
                      reportType === 'bug' ? "active-selection" : "glass hover:bg-white/10"
                    )}
                  >
                    <Bug className="w-4 h-4" />
                    Bug
                  </button>
                  <button
                    onClick={() => setReportType('feature')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors",
                      reportType === 'feature' ? "active-selection" : "glass hover:bg-white/10"
                    )}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Feature
                  </button>
                </div>

                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-3 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none text-sm"
                />

                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none text-sm resize-none"
                />

                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-2 animate-fade-in">
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reports yet</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="glass rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {report.report_type === 'bug' ? (
                            <Bug className="w-3 h-3 text-destructive flex-shrink-0" />
                          ) : (
                            <Lightbulb className="w-3 h-3 text-accent flex-shrink-0" />
                          )}
                          <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                        </div>
                        {report.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {report.description}
                          </p>
                        )}
                      </div>
                      <select
                        value={report.status}
                        onChange={(e) => handleUpdateReportStatus(report.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded glass bg-transparent border-0"
                      >
                        <option value="pending" className="bg-popover">Pending</option>
                        <option value="in_progress" className="bg-popover">In Progress</option>
                        <option value="resolved" className="bg-popover">Resolved</option>
                        <option value="rejected" className="bg-popover">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="space-y-2 animate-fade-in">
              {pendingFonts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending font requests</p>
              ) : (
                pendingFonts.map((font) => (
                  <div key={font.id} className="glass rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{font.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(font.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleApproveFont(font.id)}
                      className="p-2 rounded-lg glass-interactive"
                    >
                      <Check className="w-4 h-4 text-accent" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
