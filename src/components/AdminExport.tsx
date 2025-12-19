import { useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AdminExport = ({ isOpen, onClose }: Props) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build data content
      const buildData = `
ARRIVA.MV BUILD DATA EXPORT
============================
Generated: ${new Date().toISOString()}

PROJECT OVERVIEW
----------------
Name: Arriva.MV
Description: Maldives Flight Arrival Tracker
Framework: React + Vite + TypeScript
Styling: Tailwind CSS
Backend: Supabase (Lovable Cloud)
PWA: Yes, with push notifications

DATA SOURCES
------------
1. Flight Data: Velana International Airport FIDS
   - Scraping endpoint: https://vfrfids.macl.aero/arrivals
   - Update frequency: 30 seconds polling + realtime

2. Weather Data:
   - Primary: WeatherStack API
   - Fallback: OpenWeatherMap API
   - Location: Malé, Maldives (4.1755, 73.5093)

3. Live Flight Tracking:
   - Provider: FlightAware AeroAPI
   - Tracking starts: 4-5 hours before scheduled landing

SECRETS CONFIGURED (Names Only)
-------------------------------
- FLIGHTAWARE_API_KEY
- WEATHERSTACK_API_KEY
- OPENWEATHERMAP_API_KEY
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- RESEND_API_KEY
- FIREBASE_API_KEY
- FIREBASE_SENDER_ID

IMAGE ASSETS
------------
- Header Logo: /src/assets/header-logo.png
- App Icon: /public/icon-512.png
- Splash Logo: /public/splash-logo.png
- Background Overlay: /src/assets/background-overlay.png
- Weather Assets: /src/assets/weather-assets.png

Airline Logos: ImageKit CDN
- Base URL: https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/

Weather Icons: ImageKit CDN
- Base URL: https://imagekit.io/public/share/jv0j9qvtw/...

EDGE FUNCTIONS
--------------
1. scrape-flights: Scrapes FIDS and updates database
2. get-weather: Fetches weather from WeatherStack/OpenWeatherMap
3. track-flight: Gets live position from FlightAware
4. send-notification: Sends push/email/SMS notifications
5. send-web-push: Web Push notification delivery

DATABASE TABLES
---------------
1. flights: Flight schedule data
2. profiles: User profiles with push subscriptions
3. notification_subscriptions: User flight subscriptions
4. notification_log: Notification delivery history

KEY FEATURES
------------
- Real-time flight tracking with animated progress
- Push notifications for status changes (Landed/Delayed)
- Weather-reactive animated background
- Customizable fonts (50+ options)
- PWA installable
- CSV export functionality
- Multi-terminal grouping (T1, T2, Domestic)

FONTS INTEGRATED
----------------
Inter, Roboto, Orbitron, Bebas Neue, Space Grotesk,
PT Sans Narrow, Instrument Serif, Kanit, Teko,
Electrolize, Quantico, Audiowide, Play, Iceland,
And 35+ more from Google Fonts

CSS ANIMATIONS
--------------
- Rain animation with wind effects
- Cloud drift animation
- Glass morphism effects
- Status ripple animations
- Auth logo float/glow
- Plane landing/takeoff

REPLICATION PROMPT
------------------
To recreate this app in Lovable, use this prompt:

"Create a flight arrival tracker for Maldives (Velana International Airport) with:
- Real-time scraping from FIDS
- Weather-reactive animated background with rain/clouds
- Glass morphism UI design in dark theme
- Push notifications for flight status changes
- Live flight tracking with FlightAware
- PWA support with offline capability
- CSV export for schedules
- Multi-terminal grouping
- 50+ font options
- Status-based color coding (Delayed: orange, Landed: cyan, Cancelled: red)"

============================
END OF BUILD DATA
      `.trim();

      // Create and download file
      const blob = new Blob([buildData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arriva-build-data-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Build data exported');
      onClose();
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground">Admin Export</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Export build data including API configurations, image URLs, secrets list, and replication prompt.
          </p>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 rounded-lg glass-interactive flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {isExporting ? 'Exporting...' : 'Export Build Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminExport;
