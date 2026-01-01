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
  { start: 0, end: 4.867, hex: '#0c0c0e', name: 'night' },
  { start: 4.867, end: 5.3, hex: '#141416', name: 'astronomical' },
  { start: 5.3, end: 5.733, hex: '#1c1c1f', name: 'nautical' },
  { start: 5.733, end: 6.117, hex: '#272730', name: 'civil' },
  { start: 6.117, end: 18, hex: '#424242', name: 'daylight' },
  { start: 18, end: 18.383, hex: '#272730', name: 'civil' },
  { start: 18.383, end: 18.817, hex: '#1c1c1f', name: 'nautical' },
  { start: 18.817, end: 19.25, hex: '#141416', name: 'astronomical' },
  { start: 19.25, end: 24, hex: '#0c0c0e', name: 'night' },
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
    timeToChange: number;
    chanceOfRain: number;
    hourlyForecast: Array<{ time: string; condition: string; precipitation: number; temp: number }>;
  };
}

function getCurrentMaldivesTime(): { hours: number; minutes: number; decimalHours: number; date: Date } {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const maldivesTime = new Date(utc + 5 * 3600000);
  const hours = maldivesTime.getHours();
  const minutes = maldivesTime.getMinutes();
  const decimalHours = hours + minutes / 60;
  return { hours, minutes, decimalHours, date: maldivesTime };
}

function getGradientForTime(decimalHours: number): { top: string; mid: string; bottom: string; phase: string } {
  for (const segment of TIME_SEGMENTS) {
    if (decimalHours >= segment.start && decimalHours < segment.end) {
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

function calculateMoonPosition(decimalHours: number, date: Date): { x: number; y: number; visible: boolean; phase: number; illumination: number } {
  const moonriseHour = 18.5;
  const moonsetHour = 6;
  
  const isNightTime = decimalHours >= moonriseHour || decimalHours <= moonsetHour;
  
  if (!isNightTime) {
    return { x: 0.5, y: 1.2, visible: false, phase: 0.5, illumination: 50 };
  }
  
  let nightProgress: number;
  if (decimalHours >= moonriseHour) {
    nightProgress = (decimalHours - moonriseHour) / (24 - moonriseHour + moonsetHour);
  } else {
    nightProgress = (decimalHours + 24 - moonriseHour) / (24 - moonriseHour + moonsetHour);
  }
  
  const posX = nightProgress;
  const posY = 0.15 + 0.25 * Math.sin(nightProgress * Math.PI);
  
  // Accurate moon phase calculation
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Calculate Julian date
  const a = Math.floor((14 - month) / 12);
  const jy = year + 4800 - a;
  const jm = month + 12 * a - 3;
  const jd = day + Math.floor((153 * jm + 2) / 5) + 365 * jy + Math.floor(jy / 4) - Math.floor(jy / 100) + Math.floor(jy / 400) - 32045;
  
  // Days since new moon (Jan 6, 2000 was a new moon)
  const daysSinceNew = jd - 2451550.1;
  const lunationLength = 29.53058867;
  const phase = (daysSinceNew % lunationLength) / lunationLength;
  
  // Illumination: 0 at new moon, 100 at full moon, 0 at next new moon
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  
  return { x: posX, y: 1 - posY, visible: true, phase, illumination };
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

// Yr.no API (primary - free, no API key needed)
async function fetchWeatherFromYrNo(): Promise<any> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${MALE_LAT}&lon=${MALE_LON}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ArrivaMV/1.0 (https://arriva.mv; contact@arriva.mv)'
    }
  });
  if (!response.ok) throw new Error(`Yr.no API failed: ${response.status}`);
  return response.json();
}

// Map Yr.no weather symbols to conditions
function mapYrNoSymbol(symbol: string): string {
  if (!symbol) return 'clear';
  const s = symbol.toLowerCase();
  if (s.includes('thunder')) return 'thunderstorm';
  if (s.includes('rain') || s.includes('sleet')) return 'rain';
  if (s.includes('cloudy')) return 'cloudy';
  if (s.includes('partlycloudy') || s.includes('fair')) return 'partly cloudy';
  return 'clear';
}

// Parse Yr.no response
function parseYrNoData(data: any): {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCoverage: number;
  hourlyForecast: Array<{ time: string; condition: string; precipitation: number; temp: number }>;
} | null {
  const timeseries = data?.properties?.timeseries;
  if (!timeseries || timeseries.length === 0) return null;
  
  const current = timeseries[0];
  const instant = current?.data?.instant?.details || {};
  const next1h = current?.data?.next_1_hours || {};
  
  // Extract hourly forecast (next 24 hours)
  const hourlyForecast = timeseries.slice(0, 24).map((t: any) => ({
    time: t.time,
    condition: mapYrNoSymbol(t.data?.next_1_hours?.summary?.symbol_code || 'clearsky_day'),
    precipitation: t.data?.next_1_hours?.details?.precipitation_amount || 0,
    temp: t.data?.instant?.details?.air_temperature || 28,
  }));
  
  return {
    condition: mapYrNoSymbol(next1h.summary?.symbol_code || 'clearsky_day'),
    temperature: Math.round(instant.air_temperature || 28),
    humidity: Math.round(instant.relative_humidity || 75),
    windSpeed: Math.round((instant.wind_speed || 5) * 3.6), // Convert m/s to km/h
    windDirection: Math.round(instant.wind_from_direction || 180),
    precipitation: next1h.details?.precipitation_amount || 0,
    cloudCoverage: Math.round(instant.cloud_area_fraction || 20),
    hourlyForecast,
  };
}

// Fallback: Weatherstack
async function fetchWeatherFromWeatherstack(apiKey: string): Promise<any> {
  const url = `http://api.weatherstack.com/current?access_key=${apiKey}&query=${MALE_LAT},${MALE_LON}&units=m`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weatherstack API failed');
  return response.json();
}

// Fallback: OpenWeatherMap
async function fetchWeatherFromOpenWeatherMap(apiKey: string): Promise<any> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${MALE_LAT}&lon=${MALE_LON}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenWeatherMap API failed');
  return response.json();
}

async function fetchForecastFromOpenWeatherMap(apiKey: string): Promise<any> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${MALE_LAT}&lon=${MALE_LON}&appid=${apiKey}&units=metric&cnt=24`;
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
    if (astronomyCache && (now - astronomyCache.timestamp) < CACHE_TTL_MS) {
      console.log('Returning cached astronomy data');
      return new Response(JSON.stringify({ ...astronomyCache.data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching weather data for Maldives');
    
    const weatherstackKey = Deno.env.get('WEATHERSTACK_API_KEY');
    const openWeatherKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
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
    let hourlyForecast: Array<{ time: string; condition: string; precipitation: number; temp: number }> = [];
    let weatherSource = 'default';
    
    // Try Yr.no first (free, no API key needed)
    try {
      console.log('Trying Yr.no API...');
      const yrnoData = await fetchWeatherFromYrNo();
      const parsed = parseYrNoData(yrnoData);
      
      if (parsed) {
        condition = parsed.condition;
        temperature = parsed.temperature;
        humidity = parsed.humidity;
        windSpeed = parsed.windSpeed;
        windDirection = parsed.windDirection;
        precipitation = parsed.precipitation;
        cloudCoverage = parsed.cloudCoverage;
        hourlyForecast = parsed.hourlyForecast;
        weatherSource = 'yr.no';
        
        // Calculate next condition change and chance of rain from hourly forecast
        const currentCondition = condition.toLowerCase();
        for (let i = 1; i < hourlyForecast.length; i++) {
          if (hourlyForecast[i].condition !== currentCondition && !nextCondition) {
            nextCondition = hourlyForecast[i].condition;
            const itemTime = new Date(hourlyForecast[i].time);
            const nowTime = new Date();
            timeToChange = Math.round((itemTime.getTime() - nowTime.getTime()) / (1000 * 60));
          }
        }
        
        // Calculate chance of rain from forecast
        const rainHours = hourlyForecast.filter(h => 
          h.condition.includes('rain') || h.precipitation > 0.1
        ).length;
        chanceOfRain = Math.round((rainHours / hourlyForecast.length) * 100);
        
        console.log('Weather from Yr.no:', { condition, temperature, cloudCoverage });
      }
    } catch (e) {
      console.log('Yr.no failed, trying fallbacks:', e);
    }
    
    // Fallback to Weatherstack
    if (weatherSource === 'default' && weatherstackKey) {
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
          weatherSource = 'weatherstack';
          console.log('Weather from Weatherstack:', condition);
        }
      } catch (e) {
        console.log('Weatherstack failed:', e);
      }
    }
    
    // Fallback to OpenWeatherMap
    if (weatherSource === 'default' && openWeatherKey) {
      try {
        const owmData = await fetchWeatherFromOpenWeatherMap(openWeatherKey);
        if (owmData.weather) {
          condition = owmData.weather[0]?.description?.toLowerCase() || 'clear';
          temperature = Math.round(owmData.main?.temp || 28);
          humidity = owmData.main?.humidity || 75;
          windSpeed = Math.round((owmData.wind?.speed || 5) * 3.6);
          windDirection = owmData.wind?.deg || 180;
          precipitation = owmData.rain?.['1h'] || 0;
          cloudCoverage = owmData.clouds?.all || 20;
          weatherSource = 'openweathermap';
          console.log('Weather from OpenWeatherMap:', condition);
        }
        
        // Get forecast for predictions
        try {
          const forecastData = await fetchForecastFromOpenWeatherMap(openWeatherKey);
          if (forecastData.list && forecastData.list.length > 1) {
            const currentCond = condition.toLowerCase();
            for (let i = 1; i < forecastData.list.length; i++) {
              const item = forecastData.list[i];
              const itemCondition = item.weather?.[0]?.description?.toLowerCase() || '';
              if (itemCondition !== currentCond && !nextCondition) {
                nextCondition = itemCondition;
                const itemTime = new Date(item.dt * 1000);
                timeToChange = Math.round((itemTime.getTime() - Date.now()) / (1000 * 60));
                break;
              }
            }
            const rainItems = forecastData.list.filter((item: any) => 
              item.weather?.[0]?.main?.toLowerCase().includes('rain') || item.pop > 0.3
            );
            chanceOfRain = Math.round((rainItems.length / forecastData.list.length) * 100);
            
            hourlyForecast = forecastData.list.map((item: any) => ({
              time: new Date(item.dt * 1000).toISOString(),
              condition: item.weather?.[0]?.description?.toLowerCase() || 'clear',
              precipitation: item.rain?.['3h'] || 0,
              temp: Math.round(item.main?.temp || 28),
            }));
          }
        } catch (forecastError) {
          console.log('Forecast fetch failed:', forecastError);
        }
      } catch (e) {
        console.log('OpenWeatherMap also failed:', e);
      }
    }
    
    // Get current Maldives time
    const { decimalHours, date } = getCurrentMaldivesTime();
    
    // Calculate gradient and sky phase
    const { top, mid, bottom, phase } = getGradientForTime(decimalHours);
    
    // Calculate celestial positions with accurate moon phase
    const sunData = calculateSunPosition(decimalHours);
    const moonData = calculateMoonPosition(decimalHours, date);
    
    // Generate stars (only visible at night)
    const isNight = phase === 'night' || phase === 'astronomical' || phase === 'nautical';
    const stars = isNight ? generateStars(150) : [];
    
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
      { x: Math.random(), y: Math.random() * 0.5, time: Date.now() + Math.random() * 8000 },
    ] : [];
    
    // Astronomy times for Maldives
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
        hourlyForecast,
      },
    };

    // Cache the result
    astronomyCache = { data: payload, timestamp: Date.now() };

    console.log('Weather payload generated:', { phase, condition, isRaining, hasLightning, chanceOfRain, weatherSource });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-weather-astronomy:', error);
    
    // Return default payload on error
    const { decimalHours, date } = getCurrentMaldivesTime();
    const { top, mid, bottom, phase } = getGradientForTime(decimalHours);
    const moonData = calculateMoonPosition(decimalHours, date);
    
    const defaultPayload: WeatherPayload = {
      gradient: { top, mid, bottom },
      skyPhase: phase,
      celestialObjects: {
        sun: { visible: false, position: { x: 0.5, y: 0.5 }, brightness: 0 },
        moon: { visible: moonData.visible, position: { x: moonData.x, y: moonData.y }, phase: moonData.phase, illumination: moonData.illumination },
      },
      clouds: [],
      rain: { active: false, intensity: 0, windSpeed: 5, windDirection: 180 },
      lightning: { active: false, events: [] },
      stars: phase === 'night' ? generateStars(150) : [],
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
        hourlyForecast: [],
      },
    };

    return new Response(JSON.stringify(defaultPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});