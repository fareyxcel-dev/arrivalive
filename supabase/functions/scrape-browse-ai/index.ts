import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrowseAITask {
  id: string;
  status: string;
  capturedData?: any;
}

// Cache for weather and astronomy data
interface CacheEntry {
  data: any;
  timestamp: number;
}

let weatherCache: CacheEntry | null = null;
let astronomyCache: CacheEntry | null = null;
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const ASTRONOMY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskType } = await req.json();
    
    const browseAiApiKey = Deno.env.get("BROWSE_AI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!browseAiApiKey) {
      console.error("BROWSE_AI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Browse AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const now = Date.now();
    if (taskType === 'weather' && weatherCache && (now - weatherCache.timestamp) < WEATHER_CACHE_TTL) {
      console.log("Returning cached weather data from Browse AI");
      return new Response(
        JSON.stringify({ success: true, data: weatherCache.data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (taskType === 'astronomy' && astronomyCache && (now - astronomyCache.timestamp) < ASTRONOMY_CACHE_TTL) {
      console.log("Returning cached astronomy data from Browse AI");
      return new Response(
        JSON.stringify({ success: true, data: astronomyCache.data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Browse AI Robot IDs - these need to be configured after creating robots in Browse AI
    // For weather: scrape https://www.timeanddate.com/weather/maldives/male/hourly
    // For astronomy: scrape https://www.timeanddate.com/astronomy/maldives/male and https://www.timeanddate.com/astronomy/night/maldives/male
    const ROBOTS = {
      weather: Deno.env.get("BROWSE_AI_WEATHER_ROBOT_ID") || "",
      astronomy: Deno.env.get("BROWSE_AI_ASTRONOMY_ROBOT_ID") || "",
    };

    const robotId = ROBOTS[taskType as keyof typeof ROBOTS];
    
    if (!robotId) {
      console.log(`No Browse AI robot configured for ${taskType}, returning fallback indicator`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback: true,
          message: `Browse AI robot for ${taskType} not configured` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start a new task
    console.log(`Starting Browse AI task for ${taskType}...`);
    
    const taskResponse = await fetch(`https://api.browse.ai/v2/robots/${robotId}/tasks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${browseAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!taskResponse.ok) {
      const errorData = await taskResponse.text();
      console.error("Browse AI task creation failed:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to create Browse AI task", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskData = await taskResponse.json();
    const taskId = taskData.result?.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "No task ID returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Browse AI task created: ${taskId}`);

    // Poll for task completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    let result: BrowseAITask | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.browse.ai/v2/robots/${robotId}/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${browseAiApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      result = statusData.result;

      if (result?.status === "successful") {
        console.log("Browse AI task completed successfully");
        break;
      } else if (result?.status === "failed") {
        console.error("Browse AI task failed");
        return new Response(
          JSON.stringify({ error: "Browse AI task failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      attempts++;
    }

    if (!result || result.status !== "successful") {
      return new Response(
        JSON.stringify({ error: "Browse AI task timed out" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and cache the result based on task type
    const capturedData = result.capturedData;
    
    if (taskType === 'weather') {
      // Parse weather data from scraped content
      const weatherData = parseWeatherData(capturedData);
      weatherCache = { data: weatherData, timestamp: now };
      
      return new Response(
        JSON.stringify({ success: true, data: weatherData, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (taskType === 'astronomy') {
      // Parse astronomy data from scraped content
      const astronomyData = parseAstronomyData(capturedData);
      astronomyCache = { data: astronomyData, timestamp: now };
      
      return new Response(
        JSON.stringify({ success: true, data: astronomyData, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: capturedData, taskId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Browse AI scrape error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse weather data from Browse AI scraped content
function parseWeatherData(capturedData: any): any {
  try {
    // Expected structure from timeanddate.com hourly weather page
    // Adjust based on actual Browse AI robot configuration
    const hourlyForecast = [];
    
    if (capturedData?.hourlyData && Array.isArray(capturedData.hourlyData)) {
      for (const hour of capturedData.hourlyData) {
        hourlyForecast.push({
          time: hour.time || '',
          condition: hour.condition || 'clear',
          temp: parseInt(hour.temperature) || 28,
          precipitation: parseFloat(hour.precipitation) || 0,
          humidity: parseInt(hour.humidity) || 75,
          windSpeed: parseFloat(hour.windSpeed) || 5,
        });
      }
    }

    // Current weather from first hour or separate current data
    const current = capturedData?.current || hourlyForecast[0] || {};
    
    return {
      temp: parseInt(current.temperature) || 28,
      condition: current.condition || 'Partly Cloudy',
      humidity: parseInt(current.humidity) || 75,
      windSpeed: parseFloat(current.windSpeed) || 5,
      windDirection: parseInt(current.windDirection) || 180,
      precipitation: parseFloat(current.precipitation) || 0,
      isRaining: (current.condition || '').toLowerCase().includes('rain'),
      hourlyForecast,
      chanceOfRain: calculateChanceOfRain(hourlyForecast),
    };
  } catch (e) {
    console.error("Error parsing weather data:", e);
    return {
      temp: 28,
      condition: 'Partly Cloudy',
      humidity: 75,
      windSpeed: 5,
      windDirection: 180,
      precipitation: 0,
      isRaining: false,
      hourlyForecast: [],
      chanceOfRain: 0,
    };
  }
}

// Parse astronomy data from Browse AI scraped content
function parseAstronomyData(capturedData: any): any {
  try {
    // Expected structure from timeanddate.com astronomy pages
    return {
      sunrise: capturedData?.sunrise || '06:07',
      sunset: capturedData?.sunset || '18:00',
      moonrise: capturedData?.moonrise || '18:30',
      moonset: capturedData?.moonset || '06:00',
      moonPhase: capturedData?.moonPhase || 'Waxing Gibbous',
      moonIllumination: parseInt(capturedData?.moonIllumination) || 75,
      dayLength: capturedData?.dayLength || '11h 53m',
      civilTwilightStart: capturedData?.civilTwilightStart || '05:49',
      civilTwilightEnd: capturedData?.civilTwilightEnd || '18:18',
      nauticalTwilightStart: capturedData?.nauticalTwilightStart || '05:25',
      nauticalTwilightEnd: capturedData?.nauticalTwilightEnd || '18:42',
    };
  } catch (e) {
    console.error("Error parsing astronomy data:", e);
    return {
      sunrise: '06:07',
      sunset: '18:00',
      moonrise: '18:30',
      moonset: '06:00',
      moonPhase: 'Waxing Gibbous',
      moonIllumination: 75,
      dayLength: '11h 53m',
    };
  }
}

// Calculate chance of rain from hourly forecast
function calculateChanceOfRain(hourlyForecast: any[]): number {
  if (!hourlyForecast || hourlyForecast.length === 0) return 0;
  
  const rainHours = hourlyForecast.filter(h => 
    h.condition?.toLowerCase().includes('rain') || 
    h.precipitation > 0.1
  ).length;
  
  return Math.round((rainHours / Math.min(hourlyForecast.length, 12)) * 100);
}