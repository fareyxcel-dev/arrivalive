import { useState, useEffect } from 'react';
import { X, Bell, AlertTriangle, Plane, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';
import headerLogo from '@/assets/header-logo.png';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationEntry {
  id: string;
  flight_id: string;
  flight_date: string;
  action: 'subscribed' | 'unsubscribed';
  created_at: string;
  origin?: string;
}

interface AlertEntry {
  id: string;
  flight_id: string;
  origin?: string;
  alert_type: string;
  new_status: string;
  created_at: string;
}

interface PushNotificationEntry {
  id: string;
  notification_type: string;
  status_change: string;
  success: boolean;
  sent_at: string;
  subscription_id: string;
}

interface AppUpdate {
  id: string;
  version: string;
  title: string;
  description: string;
  release_date: string;
}

const NotificationsModal = ({ isOpen, onClose }: Props) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications' | 'updates'>('alerts');
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [pushLogs, setPushLogs] = useState<PushNotificationEntry[]>([]);
  const [appUpdate, setAppUpdate] = useState<AppUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdatesTab, setShowUpdatesTab] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load user's notification subscriptions with flight details
        const { data: subs } = await supabase
          .from('notification_subscriptions')
          .select('id, flight_id, flight_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (subs && subs.length > 0) {
          // Fetch flight details for subscribed flights
          const flightIds = [...new Set(subs.map(s => s.flight_id))];
          const { data: flightDetails } = await supabase
            .from('flights')
            .select('flight_id, origin')
            .in('flight_id', flightIds);
          
          const flightMap = new Map(flightDetails?.map(f => [f.flight_id, f.origin]) || []);
          
          setNotifications(subs.map(s => ({
            id: s.id,
            flight_id: s.flight_id,
            flight_date: s.flight_date,
            action: 'subscribed',
            created_at: s.created_at,
            origin: flightMap.get(s.flight_id) || '',
          })));
        }

        // Load push notification logs for this user
        const { data: logs } = await supabase
          .from('notification_log')
          .select('id, notification_type, status_change, success, sent_at, subscription_id')
          .order('sent_at', { ascending: false })
          .limit(50);

        if (logs) {
          setPushLogs(logs);
        }
      }

      // Load all flight alerts (public) - today's alerts only
      const today = new Date().toISOString().split('T')[0];
      const { data: alertsData } = await supabase
        .from('flight_alerts')
        .select('id, flight_id, origin, alert_type, new_status, created_at')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertsData) {
        setAlerts(alertsData);
      }

      // Load today's app update (if any)
      const { data: updates } = await supabase
        .from('app_updates')
        .select('id, version, title, description, release_date')
        .eq('is_public', true)
        .eq('release_date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updates && updates.length > 0) {
        setAppUpdate(updates[0]);
        setShowUpdatesTab(true);
      } else {
        setAppUpdate(null);
        setShowUpdatesTab(false);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeSince = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateStr);
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'landed':
        return <Plane className="w-4 h-4 text-accent" />;
      case 'delayed':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-foreground" />;
    }
  };

  const getAlertBorderColor = (alertType: string) => {
    switch (alertType) {
      case 'landed':
        return 'border-l-accent';
      case 'delayed':
        return 'border-l-orange-400';
      case 'cancelled':
        return 'border-l-red-400';
      default:
        return 'border-l-foreground/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div
        className="rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in glass-neumorphic"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px) saturate(1.2)', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: settings.fontFamily }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('alerts')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
              activeTab === 'alerts'
                ? "text-foreground border-b-2 border-foreground/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
              activeTab === 'notifications'
                ? "text-foreground border-b-2 border-foreground/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
          {showUpdatesTab && (
            <button
              onClick={() => setActiveTab('updates')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                activeTab === 'updates'
                  ? "text-foreground border-b-2 border-foreground/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>Updates</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 animate-pulse">
              Loading...
            </div>
          ) : activeTab === 'alerts' ? (
            <div className="space-y-2 animate-fade-in">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No flight alerts today
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "glass rounded-lg p-3 flex items-center gap-3 border-l-2",
                      getAlertBorderColor(alert.alert_type)
                    )}
                  >
                    {getAlertIcon(alert.alert_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {alert.flight_id}
                        </p>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold",
                          alert.alert_type === 'landed' && "bg-accent/20 text-accent",
                          alert.alert_type === 'delayed' && "bg-orange-500/20 text-orange-400",
                          alert.alert_type === 'cancelled' && "bg-red-500/20 text-red-400"
                        )}>
                          {alert.alert_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alert.origin && `${alert.origin} • `}
                        {getTimeSince(alert.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'notifications' ? (
            <div className="space-y-2 animate-fade-in">
              {notifications.length === 0 && pushLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notification subscriptions yet.<br />
                  <span className="text-xs">Tap the bell icon on a flight to subscribe.</span>
                </p>
              ) : (
                <>
                  {/* Subscriptions */}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="glass-neumorphic rounded-lg p-3 flex items-center gap-3"
                    >
                      <Bell className="w-4 h-4 text-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notif.flight_id}
                          {notif.origin && <span className="text-muted-foreground font-normal"> from {notif.origin}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Subscribed {formatDate(notif.created_at)} at {formatTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Push notification logs */}
                  {pushLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "glass rounded-lg p-3 flex items-center gap-3 border-l-2",
                        log.success ? "border-l-accent" : "border-l-destructive"
                      )}
                    >
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.notification_type}: {log.status_change}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getTimeSince(log.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Updates tab */
            <div className="animate-fade-in">
              {appUpdate ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground text-sm">What's new for</p>
                  <img 
                    src={headerLogo} 
                    alt="Arriva.MV" 
                    className="h-10 mx-auto object-contain"
                  />
                  <div className="glass rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                        v{appUpdate.version}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(appUpdate.release_date)}
                      </span>
                    </div>
                    <h3 className="text-foreground font-semibold mb-2">{appUpdate.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {appUpdate.description}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No updates today
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;