import { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Header from '@/components/Header';
import WeatherBar from '@/components/WeatherBar';
import TerminalGroup from '@/components/TerminalGroup';
import SettingsModal from '@/components/SettingsModal';
import ExportModal from '@/components/ExportModal';
import { Flight } from '@/components/FlightCard';
import { toast } from 'sonner';

// Mock flight data - will be replaced with real API data
const MOCK_FLIGHTS: Flight[] = [
  { id: '1', flightId: 'G9 093', origin: 'Sharjah', scheduledTime: '08:10', estimatedTime: '07:57', terminal: 'T1', status: 'LANDED', date: 'Wednesday 18 Dec, 2024', airlineCode: 'G9' },
  { id: '2', flightId: 'EK 652', origin: 'Dubai', scheduledTime: '09:30', estimatedTime: '09:45', terminal: 'T1', status: 'DELAYED', date: 'Wednesday 18 Dec, 2024', airlineCode: 'EK' },
  { id: '3', flightId: 'SQ 452', origin: 'Singapore', scheduledTime: '10:15', estimatedTime: '10:15', terminal: 'T1', status: '-', date: 'Wednesday 18 Dec, 2024', airlineCode: 'SQ' },
  { id: '4', flightId: 'QR 674', origin: 'Doha', scheduledTime: '11:00', estimatedTime: '11:00', terminal: 'T2', status: '-', date: 'Wednesday 18 Dec, 2024', airlineCode: 'QR' },
  { id: '5', flightId: 'TK 730', origin: 'Istanbul', scheduledTime: '12:30', estimatedTime: '12:30', terminal: 'T2', status: '-', date: 'Wednesday 18 Dec, 2024', airlineCode: 'TK' },
  { id: '6', flightId: 'Q2 401', origin: 'Gan Island', scheduledTime: '14:00', estimatedTime: '14:00', terminal: 'DOM', status: '-', date: 'Wednesday 18 Dec, 2024', airlineCode: 'Q2' },
  { id: '7', flightId: 'Q2 501', origin: 'Kaadedhdhoo', scheduledTime: '15:30', estimatedTime: '15:30', terminal: 'DOM', status: 'CANCELLED', date: 'Wednesday 18 Dec, 2024', airlineCode: 'Q2' },
];

const OPENWEATHER_API_KEY = '78aaad585d417afad796fd6c0aaea73b';

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; condition: string; humidity: number; windSpeed: number } | null>(null);
  const [flights, setFlights] = useState<Flight[]>(MOCK_FLIGHTS);
  const [notificationIds, setNotificationIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Male,MV&units=metric&appid=${OPENWEATHER_API_KEY}`
        );
        const data = await res.json();
        setWeather({
          temp: data.main.temp,
          condition: data.weather[0].main,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
        });
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Every 10 min
    return () => clearInterval(interval);
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

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      toast.info('Add to home screen from your browser menu');
    }
  };

  const handleForceRefresh = () => {
    toast.success('Schedule refreshed');
    // Will trigger real API refresh
  };

  const handleToggleNotification = (flightId: string) => {
    setNotificationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flightId)) {
        newSet.delete(flightId);
        toast.info('Notifications disabled');
      } else {
        newSet.add(flightId);
        toast.success('Notifications enabled');
      }
      return newSet;
    });
  };

  const t1Flights = flights.filter(f => f.terminal === 'T1');
  const t2Flights = flights.filter(f => f.terminal === 'T2');
  const domFlights = flights.filter(f => f.terminal === 'DOM');

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground weather={weather} />
      
      <div className="relative z-10">
        <Header
          onForceRefresh={handleForceRefresh}
          onExportSchedule={() => setIsExportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isLoggedIn={isLoggedIn}
          onAuthAction={() => setIsLoggedIn(!isLoggedIn)}
          onInstallPWA={handleInstallPWA}
        />

        <main className="pb-8">
          <WeatherBar weather={weather} currentTime={currentTime} />

          <div className="px-4 space-y-4">
            <div className="glass rounded-xl p-3 text-center text-sm text-muted-foreground animate-pulse-soft">
              Loading flight data...
            </div>

            <TerminalGroup
              terminal="T1"
              flights={t1Flights}
              notificationIds={notificationIds}
              onToggleNotification={handleToggleNotification}
            />

            <TerminalGroup
              terminal="T2"
              flights={t2Flights}
              notificationIds={notificationIds}
              onToggleNotification={handleToggleNotification}
            />

            <TerminalGroup
              terminal="DOM"
              flights={domFlights}
              notificationIds={notificationIds}
              onToggleNotification={handleToggleNotification}
            />
          </div>
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} flights={flights} />
    </div>
  );
};

export default Index;
