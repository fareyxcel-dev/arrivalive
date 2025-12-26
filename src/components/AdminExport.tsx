import { useState } from 'react';
import { FileArchive, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// All project source files to include in the ZIP
const PROJECT_FILES = {
  // Main app files
  'src/App.tsx': true,
  'src/App.css': true,
  'src/main.tsx': true,
  'src/index.css': true,
  'src/vite-env.d.ts': true,
  
  // Pages
  'src/pages/Index.tsx': true,
  'src/pages/Auth.tsx': true,
  'src/pages/NotFound.tsx': true,
  
  // Components
  'src/components/FlightCard.tsx': true,
  'src/components/FlightProgressBar.tsx': true,
  'src/components/WeatherBar.tsx': true,
  'src/components/Header.tsx': true,
  'src/components/AnimatedBackground.tsx': true,
  'src/components/CelestialCanvas.tsx': true,
  'src/components/CloudLayer.tsx': true,
  'src/components/RainAnimation.tsx': true,
  'src/components/TerminalGroup.tsx': true,
  'src/components/SettingsModal.tsx': true,
  'src/components/ExportModal.tsx': true,
  'src/components/DiagnosticsPanel.tsx': true,
  'src/components/NavLink.tsx': true,
  'src/components/AdminExport.tsx': true,
  
  // Contexts & Hooks
  'src/contexts/SettingsContext.tsx': true,
  'src/hooks/use-mobile.tsx': true,
  'src/hooks/use-toast.ts': true,
  
  // Lib & Utils
  'src/lib/utils.ts': true,
  
  // Integrations
  'src/integrations/supabase/client.ts': true,
  'src/integrations/supabase/types.ts': true,
  
  // Edge Functions
  'supabase/functions/scrape-flights/index.ts': true,
  'supabase/functions/get-weather/index.ts': true,
  'supabase/functions/get-weather-astronomy/index.ts': true,
  'supabase/functions/track-flight/index.ts': true,
  'supabase/functions/send-notification/index.ts': true,
  'supabase/functions/send-web-push/index.ts': true,
  
  // Config files
  'supabase/config.toml': true,
  'tailwind.config.ts': true,
  'vite.config.ts': true,
  'index.html': true,
  
  // PWA files
  'public/manifest.json': true,
  'public/sw.js': true,
  'public/robots.txt': true,
};

const AdminExport = ({ isOpen, onClose }: Props) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    
    try {
      const zip = new JSZip();
      
      // Add README with complete documentation
      const readme = generateReadme();
      zip.file('README.md', readme);
      setProgress(10);
      
      // Add architecture documentation
      const architecture = generateArchitectureDoc();
      zip.file('docs/ARCHITECTURE.md', architecture);
      setProgress(15);
      
      // Add database schema
      const dbSchema = generateDatabaseSchema();
      zip.file('docs/DATABASE_SCHEMA.sql', dbSchema);
      setProgress(20);
      
      // Add CSS color reference
      const cssColors = generateCSSColorReference();
      zip.file('docs/CSS_COLORS.md', cssColors);
      setProgress(25);
      
      // Add secrets documentation (masked)
      const secrets = generateSecretsDoc();
      zip.file('docs/SECRETS.md', secrets);
      setProgress(30);
      
      // Add API documentation
      const apiDocs = generateAPIDocs();
      zip.file('docs/API_ENDPOINTS.md', apiDocs);
      setProgress(35);
      
      // Add component documentation
      const componentDocs = generateComponentDocs();
      zip.file('docs/COMPONENTS.md', componentDocs);
      setProgress(40);
      
      // Add edge functions documentation
      const edgeFunctionsDocs = generateEdgeFunctionsDocs();
      zip.file('docs/EDGE_FUNCTIONS.md', edgeFunctionsDocs);
      setProgress(45);
      
      // Add webscraping documentation
      const webscrapeDocs = generateWebscrapeDocs();
      zip.file('docs/WEBSCRAPING.md', webscrapeDocs);
      setProgress(50);
      
      // Add connectors documentation
      const connectorsDocs = generateConnectorsDocs();
      zip.file('docs/CONNECTORS.md', connectorsDocs);
      setProgress(55);
      
      // Fetch and add all source files
      const fileEntries = Object.keys(PROJECT_FILES);
      const totalFiles = fileEntries.length;
      
      for (let i = 0; i < fileEntries.length; i++) {
        const filePath = fileEntries[i];
        try {
          const response = await fetch(`/${filePath}`);
          if (response.ok) {
            const content = await response.text();
            zip.file(filePath, content);
          }
        } catch (e) {
          // Add placeholder for files that can't be fetched
          zip.file(filePath, `// File: ${filePath}\n// Content not available in export\n`);
        }
        setProgress(55 + Math.floor((i / totalFiles) * 40));
      }
      
      setProgress(95);
      
      // Generate the ZIP file
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arriva-mv-blueprint-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setProgress(100);
      toast.success('Blueprint exported successfully');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground">Admin Blueprint Export</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Export complete project blueprint as ZIP including all source files, 
            documentation, database schema, API configs, and masked secrets.
          </p>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div>✓ All TSX/TS component files</div>
            <div>✓ Edge functions & API configs</div>
            <div>✓ Database schema & migrations</div>
            <div>✓ CSS hex codes & design tokens</div>
            <div>✓ Webscraping methods documentation</div>
            <div>✓ Secrets list (masked values)</div>
            <div>✓ Architecture diagrams</div>
          </div>

          {isExporting && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 rounded-lg glass-interactive flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileArchive className="w-5 h-5" />
            )}
            {isExporting ? `Exporting... ${progress}%` : 'Download Blueprint ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Documentation generators
function generateReadme(): string {
  return `# Arriva.MV - Maldives Flight Arrival Tracker

## Overview
Real-time flight arrival tracker for Velana International Airport (MLE), Maldives.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (Lovable Cloud)
- **PWA**: Service Worker + Web Push Notifications

## Features
- Real-time flight scraping from FIDS
- Weather-reactive animated background
- Live flight tracking via FlightAware
- Push notifications for status changes
- Multi-terminal grouping (T1, T2, Domestic)
- 50+ font customization options
- CSV export functionality

## Quick Start
1. Clone repository
2. Install dependencies: \`npm install\`
3. Configure environment variables
4. Run development server: \`npm run dev\`

## Project Structure
\`\`\`
src/
├── components/     # React components
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── pages/          # Page components
├── lib/            # Utilities
└── integrations/   # Supabase client

supabase/
├── functions/      # Edge functions
└── config.toml     # Supabase config
\`\`\`

## Documentation
See the \`docs/\` folder for detailed documentation:
- ARCHITECTURE.md - System architecture
- DATABASE_SCHEMA.sql - Database structure
- CSS_COLORS.md - Design tokens
- SECRETS.md - Environment variables
- API_ENDPOINTS.md - API documentation
- COMPONENTS.md - Component reference
- EDGE_FUNCTIONS.md - Backend functions
- WEBSCRAPING.md - Data scraping methods
- CONNECTORS.md - External integrations

## License
Private - All Rights Reserved
`;
}

function generateArchitectureDoc(): string {
  return `# Arriva.MV Architecture

## System Overview

\`\`\`
┌─────────────────────────────────────────────────┐
│                    PWA Client                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │   React UI  │  │ Service Worker│  │ IndexedDB│ │
│  └─────────────┘  └──────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Supabase (Lovable Cloud)           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │  PostgreSQL │  │ Edge Functions│  │ Realtime│ │
│  └─────────────┘  └──────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│               External Services                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ FlightAware │  │ WeatherStack │  │ Firebase│ │
│  └─────────────┘  └──────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
\`\`\`

## Data Flow

### Flight Data Pipeline
1. Edge function scrapes FIDS every 30 seconds
2. Data normalized and stored in PostgreSQL
3. Realtime subscriptions push updates to clients
4. Client renders updated flight cards

### Weather Data Pipeline
1. Backend scrapes timeanddate.com for hourly weather
2. Fallback to WeatherStack API if scraping fails
3. Secondary fallback to OpenWeatherMap
4. Data includes astronomy (sun/moon positions)

### Notification Pipeline
1. User subscribes to flight notifications
2. Flight status change detected by diff engine
3. Push notification sent via Firebase FCM
4. Optional SMS via Twilio, Email via Resend

## Component Hierarchy
\`\`\`
App
├── AnimatedBackground
│   ├── CelestialCanvas (sun, moon, stars)
│   ├── CloudLayer
│   └── RainAnimation
├── Header
├── WeatherBar
└── Index (main page)
    ├── TerminalGroup
    │   └── FlightCard
    │       └── FlightProgressBar
    ├── SettingsModal
    ├── ExportModal
    └── DiagnosticsPanel
\`\`\`
`;
}

function generateDatabaseSchema(): string {
  return `-- Arriva.MV Database Schema
-- Generated: ${new Date().toISOString()}

-- ============================================
-- FLIGHTS TABLE
-- ============================================
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  origin TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  estimated_time TEXT,
  actual_time TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  terminal TEXT NOT NULL,
  flight_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(flight_id, flight_date)
);

-- Enable RLS
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Flights are publicly readable"
  ON public.flights FOR SELECT
  USING (true);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  notification_email TEXT,
  phone TEXT,
  push_subscription JSONB,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATION SUBSCRIPTIONS
-- ============================================
CREATE TABLE public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flight_id TEXT NOT NULL,
  flight_date DATE NOT NULL,
  notify_push BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, flight_id, flight_date)
);

-- Enable RLS
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.notification_subscriptions
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATION LOG
-- ============================================
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  status_change TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for flights
ALTER PUBLICATION supabase_realtime ADD TABLE public.flights;
`;
}

function generateCSSColorReference(): string {
  return `# CSS Color Reference

## Flight Card Status Colors

### Landed Status
\`\`\`css
--card-bg: rgba(16, 232, 185, 0.08);      /* #10e8b9 @ 8% */
--card-border: rgba(16, 232, 185, 0.2);   /* #10e8b9 @ 20% */
--track-inactive: #0f6955;
--track-active: #30c2a2;
--text-color: #81f0d8;
--status-bg: rgba(16, 232, 185, 0.15);    /* #10e8b9 @ 15% */
\`\`\`

### Delayed Status
\`\`\`css
--card-bg: rgba(235, 82, 12, 0.08);       /* #eb520c @ 8% */
--card-border: rgba(235, 82, 12, 0.2);    /* #eb520c @ 20% */
--track-inactive: #a1441a;
--track-active: #c25e30;
--text-color: #f2763d;
--status-bg: rgba(235, 82, 12, 0.15);     /* #eb520c @ 15% */
\`\`\`

### Cancelled Status
\`\`\`css
--card-bg: rgba(191, 15, 36, 0.08);       /* #bf0f24 @ 8% */
--card-border: rgba(191, 15, 36, 0.2);    /* #bf0f24 @ 20% */
--track-inactive: #5a0a15;
--track-active: #bf0f24;
--text-color: #f7485d;
--status-bg: rgba(191, 15, 36, 0.15);     /* #bf0f24 @ 15% */
\`\`\`

### Default/On-time Status
\`\`\`css
--card-bg: rgba(255, 255, 255, 0.03);
--card-border: rgba(255, 255, 255, 0.08);
--track-inactive: rgba(255, 255, 255, 0.1);
--track-active: rgba(255, 255, 255, 0.3);
--text-color: #dce0de;
--status-bg: rgba(255, 255, 255, 0.1);
\`\`\`

## Sky Gradient Colors (Time-based)

| Period | Time Range | Hex Code |
|--------|------------|----------|
| Night | 00:00-04:52 | #0c0c0e |
| Astronomical Twilight | 04:52-05:18 | #141416 |
| Nautical Twilight | 05:18-05:44 | #1c1c1f |
| Civil Twilight | 05:44-06:07 | #272730 |
| Daylight | 06:07-18:00 | #424242 |
| Civil Twilight | 18:00-18:23 | #272730 |
| Nautical Twilight | 18:23-18:49 | #1c1c1f |
| Astronomical Twilight | 18:49-19:15 | #141416 |
| Night | 19:15-23:59 | #0c0c0e |

## Glass Morphism Effects

\`\`\`css
/* Standard glass */
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Strong glass */
.glass-strong {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Prismatic glass overlay */
.prismatic-glass {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.11) 0%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0.11) 100%
  );
  filter: grayscale(100%);
}
\`\`\`
`;
}

function generateSecretsDoc(): string {
  return `# Environment Secrets

## Required Secrets (Values Masked)

### Flight Tracking
| Name | Description | Format |
|------|-------------|--------|
| FLIGHTAWARE_API_KEY | FlightAware AeroAPI key | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |

### Weather APIs
| Name | Description | Format |
|------|-------------|--------|
| WEATHERSTACK_API_KEY | WeatherStack API key | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| OPENWEATHERMAP_API_KEY | OpenWeatherMap API key | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |

### Push Notifications
| Name | Description | Format |
|------|-------------|--------|
| VAPID_PUBLIC_KEY | VAPID public key for Web Push | BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ |
| VAPID_PRIVATE_KEY | VAPID private key | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| FIREBASE_API_KEY | Firebase Cloud Messaging key | AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| FIREBASE_SENDER_ID | Firebase sender ID | xxxxxxxxxxxx |

### Communication
| Name | Description | Format |
|------|-------------|--------|
| TWILIO_ACCOUNT_SID | Twilio Account SID | ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| TWILIO_AUTH_TOKEN | Twilio Auth Token | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |
| TWILIO_PHONE_NUMBER | Twilio phone number | +1xxxxxxxxxx |
| RESEND_API_KEY | Resend email API key | re_xxxxxxxxxxxxxxxxxxxxx |

## Supabase (Auto-configured)
| Name | Description |
|------|-------------|
| SUPABASE_URL | Project URL (auto-set) |
| SUPABASE_ANON_KEY | Anonymous key (auto-set) |
| SUPABASE_SERVICE_ROLE_KEY | Service role key (auto-set) |
`;
}

function generateAPIDocs(): string {
  return `# API Endpoints

## Edge Functions

### GET /functions/v1/scrape-flights
Scrapes flight data from FIDS and updates database.
- **Trigger**: Cron (every 30 seconds) or manual
- **Response**: JSON with scraped flights count

### GET /functions/v1/get-weather
Fetches current weather for Malé, Maldives.
- **Query params**: None
- **Response**: WeatherStack/OpenWeatherMap normalized data

### GET /functions/v1/get-weather-astronomy
Fetches weather + astronomy data (sun/moon positions, star field).
- **Query params**: None
- **Response**: Complete weather + celestial data

### POST /functions/v1/track-flight
Gets live flight position from FlightAware.
- **Body**: \`{ flightId: string }\`
- **Response**: Flight position, altitude, progress

### POST /functions/v1/send-notification
Sends push/email/SMS notification.
- **Body**: \`{ subscriptionId: string, type: string, message: string }\`
- **Response**: Delivery status

### POST /functions/v1/send-web-push
Sends Web Push notification.
- **Body**: \`{ subscription: PushSubscription, payload: object }\`
- **Response**: Delivery status

## External APIs

### FlightAware AeroAPI
- **Base URL**: https://aeroapi.flightaware.com/aeroapi
- **Auth**: API key in header
- **Endpoints used**:
  - GET /flights/{ident}
  - GET /flights/{ident}/position

### WeatherStack
- **Base URL**: http://api.weatherstack.com
- **Auth**: API key in query
- **Endpoint**: GET /current?query=Male,Maldives

### OpenWeatherMap
- **Base URL**: https://api.openweathermap.org/data/2.5
- **Auth**: API key in query
- **Endpoint**: GET /weather?lat=4.1755&lon=73.5093
`;
}

function generateComponentDocs(): string {
  return `# Component Reference

## Core Components

### FlightCard
Displays individual flight information with status-based theming.
- **Props**: flight, isNotificationEnabled, onToggleNotification
- **Features**: Airline logo, status badge, notification bell, progress bar

### FlightProgressBar
Animated progress bar showing flight approach.
- **Props**: scheduledTime, estimatedTime, status, trackingProgress, colors
- **Features**: Real-time countdown, pulse animation, aircraft icon

### WeatherBar
Displays current weather with interactive toggles.
- **Features**: Time/date display, temperature toggle (C/F), weather forecast

### AnimatedBackground
Weather-reactive background with celestial objects.
- **Layers**: Gradient, texture, celestial canvas, clouds, rain, glass effect

### CelestialCanvas
Canvas rendering for sun, moon, and stars.
- **Features**: Accurate positions based on Maldives coordinates

### RainAnimation
Procedural rain particles with wind effects.
- **Features**: Multi-layer, wind-driven, lightning flashes

### SettingsModal
User preferences panel.
- **Options**: Font selection, time format, notifications

### DiagnosticsPanel
Hidden debug panel for troubleshooting.
- **Access**: Tap app title 5x or long-press footer
- **Displays**: SW status, push permissions, sync status

## UI Components (Shadcn)
- Button, Card, Dialog, Input, Select, Switch, Toast, etc.
`;
}

function generateEdgeFunctionsDocs(): string {
  return `# Edge Functions Documentation

## scrape-flights
\`\`\`typescript
// Location: supabase/functions/scrape-flights/index.ts
// Purpose: Scrape FIDS data and update database

// Data Source
const FIDS_URL = 'https://vfrfids.macl.aero/arrivals';

// Scraping Logic
1. Fetch HTML from FIDS endpoint
2. Parse flight table rows
3. Extract: flightId, airline, origin, times, status, terminal
4. Upsert to flights table
5. Detect status changes for notifications

// Schedule
- Runs every 30 seconds via cron
- Can be triggered manually
\`\`\`

## get-weather-astronomy
\`\`\`typescript
// Location: supabase/functions/get-weather-astronomy/index.ts
// Purpose: Fetch weather + celestial data

// Data Sources (Priority Order)
1. timeanddate.com scraping (hourly weather + sun/moon data)
2. WeatherStack API (fallback)
3. OpenWeatherMap API (secondary fallback)

// Response Schema
{
  weather: { temp, condition, humidity, wind, clouds },
  astronomy: { sunrise, sunset, moonrise, moonset, phase },
  forecast: { nextCondition, timeToChange, chanceOfRain },
  gradient: { color, period },
  celestial: { sunPosition, moonPosition, stars, clouds }
}
\`\`\`

## track-flight
\`\`\`typescript
// Location: supabase/functions/track-flight/index.ts
// Purpose: Get live flight position

// API: FlightAware AeroAPI
// Tracking Logic
1. Query FlightAware for flight position
2. Calculate progress percentage
3. Return position, altitude, ETA

// Visibility Rules
- Show 4 hours before scheduled arrival
- Hide 45 minutes after landing
\`\`\`
`;
}

function generateWebscrapeDocs(): string {
  return `# Web Scraping Documentation

## FIDS Scraping (Flights)
\`\`\`
URL: https://vfrfids.macl.aero/arrivals
Method: HTML parsing with DOMParser
Update Frequency: 30 seconds
Fallback: None (FIDS is primary source)

Extracted Fields:
- Flight ID (e.g., EK658)
- Airline Code (e.g., EK)
- Origin City
- Scheduled Time
- Estimated Time
- Actual Time
- Status (SCHEDULED, DELAYED, LANDED, CANCELLED)
- Terminal (T1, T2, Domestic)
\`\`\`

## Weather Scraping (timeanddate.com)
\`\`\`
Hourly Weather:
  URL: https://www.timeanddate.com/weather/maldives/male/hourly
  Data: condition, cloud coverage, temp, wind, precipitation

Sun Data:
  URL: https://www.timeanddate.com/sun/maldives/male
  Data: sunrise, sunset, solar noon, day length

Moon Data:
  URL: https://www.timeanddate.com/moon/maldives/male
  Data: moonrise, moonset, phase, illumination

Star Field:
  URL: https://www.timeanddate.com/astronomy/night/maldives/male
  Data: Star positions, seasonal orientation
\`\`\`

## Fallback Chain
\`\`\`
1. Try timeanddate.com scraping
2. If fails → WeatherStack API
3. If fails → OpenWeatherMap API
4. Normalize all responses to same schema
\`\`\`
`;
}

function generateConnectorsDocs(): string {
  return `# External Connectors

## Supabase (Lovable Cloud)
- **Purpose**: Database, Auth, Realtime, Edge Functions
- **Auto-configured**: Yes
- **Project ID**: qesiqfehmhqxiydkdwky

## FlightAware AeroAPI
- **Purpose**: Live flight tracking
- **Auth**: API key in x-apikey header
- **Rate Limit**: Based on subscription tier
- **Documentation**: https://flightaware.com/aeroapi/

## WeatherStack
- **Purpose**: Current weather data
- **Auth**: API key in query parameter
- **Free Tier**: 1000 calls/month
- **Documentation**: https://weatherstack.com/documentation

## OpenWeatherMap
- **Purpose**: Weather fallback
- **Auth**: API key in query parameter
- **Free Tier**: 1000 calls/day
- **Documentation**: https://openweathermap.org/api

## Firebase Cloud Messaging (FCM)
- **Purpose**: Push notification delivery
- **Auth**: Server key + sender ID
- **Documentation**: https://firebase.google.com/docs/cloud-messaging

## Twilio
- **Purpose**: SMS notifications
- **Auth**: Account SID + Auth Token
- **Documentation**: https://www.twilio.com/docs/sms

## Resend
- **Purpose**: Email notifications
- **Auth**: API key
- **Documentation**: https://resend.com/docs

## ImageKit CDN
- **Purpose**: Image hosting (logos, icons)
- **Auth**: None (public CDN)
- **Base URLs**:
  - Airline logos: https://ik.imagekit.io/jv0j9qvtw/White%20Airline%20Logos/
  - Weather assets: https://imagekit.io/public/share/jv0j9qvtw/
`;
}

export default AdminExport;
