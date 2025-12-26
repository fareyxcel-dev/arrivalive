import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache (5-minute TTL)
interface CacheEntry { data: any; timestamp: number }
let astronomyCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Maldives coordinates
const MALE_LAT = 4.1918;
const MALE_LON = 73.5291;

// Time segments for Maldives sky gradient
const TIME_SEGMENTS = [
  { start: 0, end: 4.867, hex: '#0c0c0e', name: 'night' },           // 00:00-04:52
  { start: 4.867, end: 5.3, hex: '#141416', name: 'astronomical' },  // 04:52-05:18
  { start: 5.3, end: 5.733, hex: '#1c1c1f', name: 'nautical' },      // 05:18-05:44
  { start: 5.733, end: 6.117, hex: '#272730', name: 'civil' },       // 05:44-06:07
  { start: 6.117, end: 18, hex: '#424242', name: 'daylight' },       // 06:07-18:00
  { start: 18, end: 18.383, hex: '#272730', name: 'civil' },         // 18:00-18:23
  { start: 18.383, end: 18.817, hex: '#1c1c1f', name: 'nautical' },  // 18:23-18:49
  { start: 18.817, end: 19.25, hex: '#141416', name: 'astronomical' }, // 18:49-19:15
  { start: 19.25, end: 24, hex: '#0c0c0e', name: 'night' },          // 19:15-23:59
];

interface WeatherPayload {
  gradient: { top: string; mid: string; bottom: string };
  skyPhase: string;
  celestialObjects: {
    sun: { visible: boolean; position: { x: number; y: number }; brightness: number };
    moon: { visible: boolean; position: { x: number; y: number }; phase: number; illumination: number };
  };
  clouds: Array<{ x: number; y: number; layer: string; opacity: number; width: number }>;
  rain: { active: boolean; intensity: number; windSpeed: number; windDirection: number };
  lightning: { active: boolean; events: Array<{ x: number; y: number; time: number }> };
  stars: Array<{ x: number; y: number; brightness: number }>;
  weather: {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCoverage: number;
  };
  astronomy: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    dayLength: string;
  };
  forecast: {
    nextCondition: string;
    timeToChange: number; // minutes
    chanceOfRain: number;
  };
}

function getCurrentMaldivesTime(): { hours: number; minutes: number; decimalHours: number } {
  const now = new Date();
  // Maldives is UTC+5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const maldivesTime = new Date(utc + 5 * 3600000);
  const hours = maldivesTime.getHours();
  const minutes = maldivesTime.getMinutes();
  const decimalHours = hours + minutes / 60;
  return { hours, minutes, decimalHours };
}

function getGradientForTime(decimalHours: number): { top: string; mid: string; bottom: string; phase: string } {
  for (const segment of TIME_SEGMENTS) {
    if (decimalHours >= segment.start && decimalHours < segment.end) {
      // Create gradient with slight variation
      const baseColor = segment.hex;
      return {
        top: baseColor,
        mid: adjustBrightness(baseColor, 0.1),
        bottom: adjustBrightness(baseColor, 0.2),
        phase: segment.name,
      };
    }
  }
  return { top: '#0c0c0e', mid: '#141416', bottom: '#1c1c1f', phase: 'night' };
}

function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function calculateSunPosition(decimalHours: number): { x: number; y: number; visible: boolean } {
  // Sun is visible between 6:07 and 18:00
  const sunriseHour = 6.117;
  const sunsetHour = 18;
  
  if (decimalHours < sunriseHour || decimalHours > sunsetHour) {
    return { x: 0.5, y: 1.2, visible: false };
  }
  
  const dayProgress = (decimalHours - sunriseHour) / (sunsetHour - sunriseHour);
  const x = dayProgress;
  // Parabolic arc: highest at noon
  const y = 0.1 + 0.3 * Math.sin(dayProgress * Math.PI);
  
  return { x, y: 1 - y, visible: true };
}

function calculateMoonPosition(decimalHours: number): { x: number; y: number; visible: boolean; phase: number; illumination: number } {
  // Simplified moon calculation (in reality would use astronomical algorithms)
  const moonriseHour = 18.5;
  const moonsetHour = 6;
  
  const isNightTime = decimalHours >= moonriseHour || decimalHours <= moonsetHour;
  
  if (!isNightTime) {
    return { x: 0.5, y: 1.2, visible: false, phase: 0.5, illumination: 50 };
  }
  
  // Calculate position in night sky
  let nightProgress: number;
  if (decimalHours >= moonriseHour) {
    nightProgress = (decimalHours - moonriseHour) / (24 - moonriseHour + moonsetHour);
  } else {
    nightProgress = (decimalHours + 24 - moonriseHour) / (24 - moonriseHour + moonsetHour);
  }
  
  const x = nightProgress;
  const y = 0.15 + 0.25 * Math.sin(nightProgress * Math.PI);
  
  // Moon phase based on day of month (simplified)
  const dayOfMonth = new Date().getDate();
  const phase = (dayOfMonth % 30) / 30;
  const illumination = Math.abs(Math.sin(phase * Math.PI)) * 100;
  
  return { x, y: 1 - y, visible: true, phase, illumination };
}

function generateStars(count: number): Array<{ x: number; y: number; brightness: number }> {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.6,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
  return stars;
}

function generateClouds(cloudCoverage: number, windSpeed: number): Array<{ x: number; y: number; layer: string; opacity: number; width: number }> {
  const count = Math.floor((cloudCoverage / 100) * 12) + 2;
  const clouds = [];
  
  for (let i = 0; i < count; i++) {
    const layer = i % 3 === 0 ? 'high' : i % 3 === 1 ? 'mid' : 'low';
    clouds.push({
      x: Math.random(),
      y: layer === 'high' ? Math.random() * 0.2 : layer === 'mid' ? 0.2 + Math.random() * 0.3 : 0.5 + Math.random() * 0.3,
      layer,
      opacity: 0.3 + Math.random() * 0.4,
      width: 0.1 + Math.random() * 0.2,
    });
  }
  
  return clouds;
}

async function fetchWeatherFromWeatherstack(apiKey: string): Promise<any> {
  const url = `http://api.weatherstack.com/current?access_key=${apiKey}&query=${MALE_LAT},${MALE_LON}&units=m`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weatherstack API failed');
  return response.json();
}

async function fetchWeatherFromOpenWeatherMap(apiKey: string): Promise<any> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${MALE_LAT}&lon=${MALE_LON}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenWeatherMap API failed');
  return response.json();
}

async function fetchForecastFromOpenWeatherMap(apiKey: string): Promise<any> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${MALE_LAT}&lon=${MALE_LON}&appid=${apiKey}&units=metric&cnt=8`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenWeatherMap Forecast API failed');
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache first
    const now = Date.now();
    const cachedData = astronomyCache;
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL_MS) {
      console.log('Returning cached astronomy data');
      return new Response(JSON.stringify({ ...cachedData.data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching weather and astronomy data for Maldives');
    
    const weatherstackKey = Deno.env.get('WEATHERSTACK_API_KEY');
    const openWeatherKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
    let weatherData: any = null;
    let condition = 'clear';
    let temperature = 28;
    let humidity = 75;
    let windSpeed = 5;
    let windDirection = 180;
    let precipitation = 0;
    let cloudCoverage = 20;
    let chanceOfRain = 0;
    let nextCondition = '';
    let timeToChange = 0;
    
    // Try Weatherstack first
    if (weatherstackKey) {
      try {
        const wsData = await fetchWeatherFromWeatherstack(weatherstackKey);
        if (wsData.current) {
          condition = wsData.current.weather_descriptions?.[0]?.toLowerCase() || 'clear';
          temperature = wsData.current.temperature || 28;
          humidity = wsData.current.humidity || 75;
          windSpeed = wsData.current.wind_speed || 5;
          windDirection = wsData.current.wind_degree || 180;
          precipitation = wsData.current.precip || 0;
          cloudCoverage = wsData.current.cloudcover || 20;
          weatherData = wsData;
          console.log('Weather data from Weatherstack:', condition);
        }
      } catch (e) {
        console.log('Weatherstack failed, trying OpenWeatherMap:', e);
      }
    }
    
    // Fallback to OpenWeatherMap
    if (!weatherData && openWeatherKey) {
      try {
        const owmData = await fetchWeatherFromOpenWeatherMap(openWeatherKey);
        if (owmData.weather) {
          condition = owmData.weather[0]?.description?.toLowerCase() || 'clear';
          temperature = owmData.main?.temp || 28;
          humidity = owmData.main?.humidity || 75;
          windSpeed = owmData.wind?.speed || 5;
          windDirection = owmData.wind?.deg || 180;
          precipitation = owmData.rain?.['1h'] || 0;
          cloudCoverage = owmData.clouds?.all || 20;
          weatherData = owmData;
          console.log('Weather data from OpenWeatherMap:', condition);
        }
        
        // Try to get forecast
        try {
          const forecastData = await fetchForecastFromOpenWeatherMap(openWeatherKey);
          if (forecastData.list && forecastData.list.length > 1) {
            const currentCondition = condition.toLowerCase();
            for (let i = 1; i < forecastData.list.length; i++) {
              const item = forecastData.list[i];
              const itemCondition = item.weather?.[0]?.description?.toLowerCase() || '';
              if (itemCondition !== currentCondition) {
                nextCondition = itemCondition;
                const itemTime = new Date(item.dt * 1000);
                const now = new Date();
                timeToChange = Math.round((itemTime.getTime() - now.getTime()) / (1000 * 60));
                break;
              }
            }
            // Calculate chance of rain
            const rainItems = forecastData.list.filter((item: any) => 
              item.weather?.[0]?.main?.toLowerCase().includes('rain') ||
              item.pop > 0.3
            );
            chanceOfRain = Math.round((rainItems.length / forecastData.list.length) * 100);
          }
        } catch (forecastError) {
          console.log('Forecast fetch failed:', forecastError);
        }
      } catch (e) {
        console.log('OpenWeatherMap also failed:', e);
      }
    }
    
    // Get current Maldives time
    const { decimalHours } = getCurrentMaldivesTime();
    
    // Calculate gradient and sky phase
    const { top, mid, bottom, phase } = getGradientForTime(decimalHours);
    
    // Calculate celestial positions
    const sunData = calculateSunPosition(decimalHours);
    const moonData = calculateMoonPosition(decimalHours);
    
    // Generate stars (only visible at night)
    const isNight = phase === 'night' || phase === 'astronomical' || phase === 'nautical';
    const stars = isNight ? generateStars(100) : [];
    
    // Generate clouds
    const clouds = generateClouds(cloudCoverage, windSpeed);
    
    // Determine rain status
    const isRaining = condition.includes('rain') || 
                      condition.includes('shower') || 
                      condition.includes('drizzle') ||
                      condition.includes('thunder') ||
                      precipitation > 0;
    
    // Determine lightning
    const hasLightning = condition.includes('thunder') || condition.includes('storm');
    const lightningEvents = hasLightning ? [
      { x: Math.random(), y: Math.random() * 0.5, time: Date.now() + Math.random() * 5000 },
    ] : [];
    
    // Fixed astronomy times for Maldives
    const astronomy = {
      sunrise: '06:07',
      sunset: '18:00',
      moonrise: '18:30',
      moonset: '06:00',
      dayLength: '11h 53m',
    };
    
    const payload: WeatherPayload = {
      gradient: { top, mid, bottom },
      skyPhase: phase,
      celestialObjects: {
        sun: { 
          visible: sunData.visible, 
          position: { x: sunData.x, y: sunData.y }, 
          brightness: sunData.visible ? 0.8 : 0 
        },
        moon: { 
          visible: moonData.visible, 
          position: { x: moonData.x, y: moonData.y }, 
          phase: moonData.phase, 
          illumination: moonData.illumination 
        },
      },
      clouds,
      rain: { 
        active: isRaining, 
        intensity: precipitation > 0 ? Math.min(precipitation / 10, 1) : (isRaining ? 0.5 : 0),
        windSpeed, 
        windDirection 
      },
      lightning: { active: hasLightning, events: lightningEvents },
      stars,
      weather: {
        condition,
        temperature,
        humidity,
        windSpeed,
        windDirection,
        precipitation,
        cloudCoverage,
      },
      astronomy,
      forecast: {
        nextCondition: nextCondition || condition,
        timeToChange,
        chanceOfRain,
      },
    };

    // Cache the result
    astronomyCache = { data: payload, timestamp: Date.now() };

    console.log('Weather payload generated:', { phase, condition, isRaining, hasLightning, chanceOfRain });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-weather-astronomy:', error);
    
    // Return default payload on error
    const { decimalHours } = getCurrentMaldivesTime();
    const { top, mid, bottom, phase } = getGradientForTime(decimalHours);
    
    const defaultPayload: WeatherPayload = {
      gradient: { top, mid, bottom },
      skyPhase: phase,
      celestialObjects: {
        sun: { visible: false, position: { x: 0.5, y: 0.5 }, brightness: 0 },
        moon: { visible: false, position: { x: 0.5, y: 0.5 }, phase: 0.5, illumination: 50 },
      },
      clouds: [],
      rain: { active: false, intensity: 0, windSpeed: 5, windDirection: 180 },
      lightning: { active: false, events: [] },
      stars: [],
      weather: {
        condition: 'clear',
        temperature: 28,
        humidity: 75,
        windSpeed: 5,
        windDirection: 180,
        precipitation: 0,
        cloudCoverage: 20,
      },
      astronomy: {
        sunrise: '06:07',
        sunset: '18:00',
        moonrise: '18:30',
        moonset: '06:00',
        dayLength: '11h 53m',
      },
      forecast: {
        nextCondition: 'clear',
        timeToChange: 0,
        chanceOfRain: 0,
      },
    };

    return new Response(JSON.stringify(defaultPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
