import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SkyIframeBackground from '@/components/SkyIframeBackground';
import NewHeader from '@/components/NewHeader';
import TerminalGroup from '@/components/TerminalGroup';
import SettingsModal from '@/components/SettingsModal';
import ExportModal from '@/components/ExportModal';
import NotificationsModal from '@/components/NotificationsModal';
import AdminDashboard from '@/components/AdminDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Flight } from '@/components/FlightCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const POLLING_INTERVAL = 30000;

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  precipitation?: number;
  isRaining?: boolean;
  hourlyForecast?: Array<{
    time: string;
    condition: string;
    temp: number;
    chanceOfRain: number;
  }>;
  chanceOfRain?: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [notificationIds, setNotificationIds] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Request notification permission on first visit for non-PWA
  useEffect(() => {
    const hasAskedPermission = localStorage.getItem('arriva-notification-asked');
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!hasAskedPermission && !isPWA && 'Notification' in window) {
      setTimeout(async () => {
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          if (result === 'granted') {
            toast.success('Notifications enabled! You\'ll be notified of flight updates.');
          }
        }
        localStorage.setItem('arriva-notification-asked', 'true');
      }, 3000);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);
        
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-flights');
          await (registration as any).sync.register('sync-weather');
        }
        
        if ('periodicSync' in registration) {
          try {
            await (registration as any).periodicSync.register('update-flights', {
              minInterval: 30 * 1000
            });
            await (registration as any).periodicSync.register('update-weather', {
              minInterval: 5 * 60 * 1000
            });
          } catch (e) {
            console.log('Periodic sync not available:', e);
          }
        }
        
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'FLIGHTS_SYNCED') {
            fetchFlights();
          }
        });
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    };
    
    registerServiceWorker();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchFlights();
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          loadUserSubscriptions(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserSubscriptions(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather with hourly forecast
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-weather');
        
        if (error) {
          console.error('Weather fetch error:', error);
          return;
        }
        
        if (data?.current) {
          setWeather({
            temp: data.current.temp,
            condition: data.current.condition,
            humidity: data.current.humidity,
            windSpeed: data.current.windSpeed,
            windDirection: data.current.windDirection,
            precipitation: data.current.precipitation,
            isRaining: data.current.isRaining,
            hourlyForecast: data.current.hourlyForecast,
            chanceOfRain: data.current.chanceOfRain,
          });
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const fetchFlights = useCallback(async (showToast = false) => {
    if (!isLoading && showToast) {
      toast.info('Refreshing...');
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-flights');
      
      if (error) {
        console.error('Scrape error:', error);
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAhead = new Date(today);
      weekAhead.setDate(weekAhead.getDate() + 7);
      const weekAheadStr = weekAhead.toISOString().split('T')[0];
      
      const { data: dbFlights, error: dbError } = await supabase
        .from('flights')
        .select('*')
        .gte('flight_date', todayStr)
        .lte('flight_date', weekAheadStr)
        .order('flight_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (dbError) {
        console.error('DB error:', dbError);
        return;
      }

      if (dbFlights && dbFlights.length > 0) {
        setFlights(dbFlights.map(f => ({
          id: f.id,
          flightId: f.flight_id,
          origin: f.origin,
          scheduledTime: f.scheduled_time,
          estimatedTime: f.estimated_time || f.scheduled_time,
          terminal: f.terminal,
          status: f.status,
          date: f.flight_date,
          airlineCode: f.airline_code,
        })));
      } else if (data?.flights) {
        setFlights(data.flights.map((f: any) => ({
          id: f.flight_id + f.flight_date,
          flightId: f.flight_id,
          origin: f.origin,
          scheduledTime: f.scheduled_time,
          estimatedTime: f.estimated_time || f.scheduled_time,
          terminal: f.terminal,
          status: f.status,
          date: f.flight_date,
          airlineCode: f.airline_code,
        })));
      }
    } catch (error) {
      console.error('Error fetching flights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Fetch flights and subscribe to realtime
  useEffect(() => {
    fetchFlights();

    const pollingInterval = setInterval(() => {
      fetchFlights();
    }, POLLING_INTERVAL);

    const channel = supabase
      .channel('flights-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flights' },
        (payload) => {
          console.log('Realtime update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setFlights(prev => {
              const newFlight = payload.new as any;
              const existing = prev.findIndex(f => f.id === newFlight.id);
              const converted: Flight = {
                id: newFlight.id,
                flightId: newFlight.flight_id,
                origin: newFlight.origin,
                scheduledTime: newFlight.scheduled_time,
                estimatedTime: newFlight.estimated_time || newFlight.scheduled_time,
                terminal: newFlight.terminal,
                status: newFlight.status,
                date: newFlight.flight_date,
                airlineCode: newFlight.airline_code,
              };
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = converted;
                return updated;
              }
              return [...prev, converted];
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const loadUserSubscriptions = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('notification_subscriptions')
      .select('flight_id')
      .eq('user_id', userId)
      .eq('flight_date', today);

    if (data) {
      setNotificationIds(new Set(data.map(s => s.flight_id)));
      setNotificationCount(data.length);
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        toast.info('Tap the Share button, then "Add to Home Screen"', { duration: 5000 });
      } else if (isAndroid) {
        toast.info('Open browser menu (⋮) and tap "Add to Home Screen"', { duration: 5000 });
      } else {
        toast.info('Add to home screen from your browser menu');
      }
    }
  };

  const handleForceRefresh = () => {
    fetchFlights(true);
  };

  const handleToggleNotification = async (flightId: string) => {
    if (!user) {
      toast.info('Please sign in to enable notifications');
      navigate('/auth');
      return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Please enable notifications in your browser');
        return;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const isSubscribed = notificationIds.has(flightId);

    if (isSubscribed) {
      const { error } = await supabase
        .from('notification_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('flight_id', flightId)
        .eq('flight_date', today);

      if (!error) {
        setNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(flightId);
          return newSet;
        });
        setNotificationCount(prev => Math.max(0, prev - 1));
        toast.info('Notifications disabled');
      }
    } else {
      const { error } = await supabase
        .from('notification_subscriptions')
        .insert({
          user_id: user.id,
          flight_id: flightId,
          flight_date: today,
          notify_push: true,
          notify_email: true,
        });

      if (!error) {
        setNotificationIds(prev => new Set(prev).add(flightId));
        setNotificationCount(prev => prev + 1);
        toast.success('You\'ll be notified when this flight lands or is delayed');
      }
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await supabase.auth.signOut();
      setNotificationIds(new Set());
      setNotificationCount(0);
      toast.success('Signed out');
    } else {
      navigate('/auth');
    }
  };

  // Filter flights - 60 minute (1 hour) cutoff
  const filteredFlights = flights.filter(flight => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (flight.date < todayStr) return false;
    if (flight.date > todayStr) return true;
    
    const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
    const statusUpper = flight.status.toUpperCase();
    
    // For landed/cancelled, use estimated time as reference
    if (statusUpper === 'LANDED' || statusUpper === 'CANCELLED') {
      const refTime = flight.estimatedTime || flight.scheduledTime;
      const [h, m] = refTime.split(':').map(Number);
      const refDateTime = new Date(now);
      refDateTime.setHours(h, m, 0, 0);
      return refDateTime >= cutoffTime;
    }
    
    // For delayed flights, use estimated arrival time
    if (statusUpper === 'DELAYED' && flight.estimatedTime) {
      const [estHours, estMinutes] = flight.estimatedTime.split(':').map(Number);
      const estimatedDateTime = new Date(now);
      estimatedDateTime.setHours(estHours, estMinutes, 0, 0);
      return estimatedDateTime >= cutoffTime;
    }
    
    // Normal flights: use scheduled time
    const [schHours, schMinutes] = flight.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(now);
    scheduledDateTime.setHours(schHours, schMinutes, 0, 0);
    return scheduledDateTime >= cutoffTime;
  });

  const t1Flights = filteredFlights.filter(f => f.terminal === 'T1');
  const t2Flights = filteredFlights.filter(f => f.terminal === 'T2');
  const domFlights = filteredFlights.filter(f => f.terminal === 'DOM');

  return (
    <div className="relative min-h-screen">
      {/* Full-screen iframe background */}
      <div className="fixed inset-0 z-0">
        <SkyIframeBackground weatherData={null} />
      </div>
      
      <div className="relative z-10">
        <NewHeader
          onForceRefresh={handleForceRefresh}
          onExportSchedule={() => setIsExportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenNotifications={() => { setIsNotificationsOpen(true); setNotificationCount(0); }}
          onOpenAdmin={() => setIsAdminOpen(true)}
          isLoggedIn={!!user}
          onAuthAction={handleAuthAction}
          onInstallPWA={handleInstallPWA}
          userEmail={user?.email}
          notificationCount={notificationCount}
          weather={weather}
          currentTime={currentTime}
        />

        {/* Main content with padding for fixed header */}
        <main className="pt-28 pb-8">
          <div className="px-4 space-y-4">
            {isLoading ? (
              <div className="glass rounded-xl p-6 flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-sm text-muted-foreground">Loading flight data...</p>
              </div>
            ) : flights.length === 0 ? (
              <div className="glass rounded-xl p-3 text-center text-sm text-muted-foreground">
                No flights found for today
              </div>
            ) : null}

            {t1Flights.length > 0 && (
              <TerminalGroup
                terminal="T1"
                flights={t1Flights}
                notificationIds={notificationIds}
                onToggleNotification={handleToggleNotification}
              />
            )}

            {t2Flights.length > 0 && (
              <TerminalGroup
                terminal="T2"
                flights={t2Flights}
                notificationIds={notificationIds}
                onToggleNotification={handleToggleNotification}
              />
            )}

            {domFlights.length > 0 && (
              <TerminalGroup
                terminal="DOM"
                flights={domFlights}
                notificationIds={notificationIds}
                onToggleNotification={handleToggleNotification}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ExportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
      />
      <NotificationsModal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
};

export default Index;
