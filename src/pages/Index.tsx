import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '@/components/AnimatedBackground';
import Header from '@/components/Header';
import WeatherBar from '@/components/WeatherBar';
import TerminalGroup from '@/components/TerminalGroup';
import SettingsModal from '@/components/SettingsModal';
import ExportModal from '@/components/ExportModal';
import { Flight } from '@/components/FlightCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const POLLING_INTERVAL = 30000; // 30 seconds

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  precipitation?: number;
  isRaining?: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [notificationIds, setNotificationIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.error('SW registration failed:', error);
        });
    }
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

  // Fetch weather from Yr.no edge function
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
          });
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchFlights = useCallback(async (showToast = false) => {
    if (!isLoading && showToast) {
      toast.info('Refreshing...');
    }
    
    try {
      // First try to get from edge function (which scrapes and updates DB)
      const { data, error } = await supabase.functions.invoke('scrape-flights');
      
      if (error) {
        console.error('Scrape error:', error);
      }

      // Fetch from database - today and upcoming days
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

  // Fetch flights and subscribe to realtime + 30s polling
  useEffect(() => {
    fetchFlights();

    // 30 second polling
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
      console.log('PWA install prompt captured');
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
      // Show instructions for manual install
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

    // Request push notification permission
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
        toast.success('You\'ll be notified when this flight lands or is delayed');
      }
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await supabase.auth.signOut();
      setNotificationIds(new Set());
      toast.success('Signed out');
    } else {
      navigate('/auth');
    }
  };

  // Filter today's flights: remove flights that are more than 1 hour before current time
  const filteredFlights = flights.filter(flight => {
    const today = new Date().toISOString().split('T')[0];
    if (flight.date !== today) return true; // Keep all future dates
    
    // For today's flights, only show if scheduled time is within 1 hour of now or later
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [hours, minutes] = flight.scheduledTime.split(':').map(Number);
    const flightTime = new Date(now);
    flightTime.setHours(hours, minutes, 0, 0);
    
    return flightTime >= oneHourAgo;
  });

  const t1Flights = filteredFlights.filter(f => f.terminal === 'T1');
  const t2Flights = filteredFlights.filter(f => f.terminal === 'T2');
  const domFlights = filteredFlights.filter(f => f.terminal === 'DOM');

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground weather={weather} />
      
      <div className="relative z-10">
        <Header
          onForceRefresh={handleForceRefresh}
          onExportSchedule={() => setIsExportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isLoggedIn={!!user}
          onAuthAction={handleAuthAction}
          onInstallPWA={handleInstallPWA}
        />

        <main className="pb-8">
          <WeatherBar weather={weather} currentTime={currentTime} />

          <div className="px-4 space-y-4">
            {isLoading ? (
              <div className="glass rounded-xl p-3 text-center text-sm text-muted-foreground animate-pulse-soft">
                Loading flight data...
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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export default Index;
