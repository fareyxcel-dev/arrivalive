import { useState, useEffect } from 'react';
import { X, Bell, AlertTriangle, Plane, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';

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

const NotificationsModal = ({ isOpen, onClose }: Props) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'notifications' | 'alerts'>('notifications');
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [pushLogs, setPushLogs] = useState<PushNotificationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load user's notification subscriptions
        const { data: subs } = await supabase
          .from('notification_subscriptions')
          .select('id, flight_id, flight_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (subs) {
          setNotifications(subs.map(s => ({
            id: s.id,
            flight_id: s.flight_id,
            flight_date: s.flight_date,
            action: 'subscribed',
            created_at: s.created_at,
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

      // Load all flight alerts (public)
      const { data: alertsData } = await supabase
        .from('flight_alerts')
        .select('id, flight_id, origin, alert_type, new_status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertsData) {
        setAlerts(alertsData);
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

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'landed':
        return <Plane className="w-4 h-4 text-accent" />;
      case 'delayed':
        return <Clock className="w-4 h-4 text-delayed" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-cancelled" />;
      default:
        return <CheckCircle className="w-4 h-4 text-foreground" />;
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-blur-strong rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: settings.fontFamily }}
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
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 animate-pulse">
              Loading...
            </div>
          ) : activeTab === 'notifications' ? (
            <div className="space-y-2 animate-fade-in">
              {notifications.length === 0 && pushLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notification subscriptions yet
                </p>
              ) : (
                <>
                  {/* Subscriptions */}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="glass rounded-lg p-3 flex items-center gap-3"
                    >
                      <Bell className="w-4 h-4 text-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notif.flight_id}
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
                        "glass rounded-lg p-3 flex items-center gap-3",
                        log.success ? "border-l-2 border-accent" : "border-l-2 border-destructive"
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
                          {formatDate(log.sent_at)} at {formatTime(log.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No flight alerts yet
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="glass rounded-lg p-3 flex items-center gap-3"
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
                        {formatDate(alert.created_at)} at {formatTime(alert.created_at)}
                      </p>
                    </div>
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

export default NotificationsModal;
