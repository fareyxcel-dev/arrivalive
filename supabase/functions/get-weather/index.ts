const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Coordinates for Malé, Maldives
    const lat = 4.1755;
    const lon = 73.5093;
    
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    
    console.log("Fetching weather data from Yr.no...");
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ArrivaMv/1.0 (arrivamv@gmail.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Weather fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const timeseries = data.properties.timeseries;
    const forecast: HourlyForecast[] = [];

    // Collect data for current + next 24 hours
    for (let i = 0; i < 25; i++) {
      if (i >= timeseries.length) break;

      const ts = timeseries[i];
      const timeUtc = new Date(ts.time);
      // Convert to Maldives Time (MVT, UTC+5)
      const timeMvt = new Date(timeUtc.getTime() + 5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const temperature = ts.data.instant.details.air_temperature;

      let condition = "unknown";
      let precipitation = 0;
      if (ts.data.next_1_hours) {
        condition = ts.data.next_1_hours.summary.symbol_code;
        precipitation = ts.data.next_1_hours.details?.precipitation_amount || 0;
      } else if (ts.data.next_6_hours) {
        condition = ts.data.next_6_hours.summary.symbol_code;
        precipitation = ts.data.next_6_hours.details?.precipitation_amount || 0;
      }

      const windSpeed = ts.data.instant.details.wind_speed;
      const windDirection = ts.data.instant.details.wind_from_direction;

      forecast.push({
        time: timeMvt,
        temperature,
        condition,
        precipitation,
        windSpeed,
        windDirection,
      });
    }

    // Get current weather (first entry)
    const current = forecast[0];
    
    // Determine rain intensity
    const isRaining = current.condition.includes("rain") || 
                      current.condition.includes("shower") ||
                      current.precipitation > 0;

    console.log(`Weather fetched: ${current.temperature}°C, ${current.condition}, rain: ${isRaining}`);

    return new Response(
      JSON.stringify({
        current: {
          temp: Math.round(current.temperature),
          condition: mapCondition(current.condition),
          humidity: 80, // Yr.no doesn't provide humidity in compact
          windSpeed: current.windSpeed,
          windDirection: current.windDirection,
          precipitation: current.precipitation,
          isRaining,
        },
        forecast,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Weather error:", error);
    
    // Fallback to basic weather data
    return new Response(
      JSON.stringify({
        current: {
          temp: 30,
          condition: "Clouds",
          humidity: 75,
          windSpeed: 5,
          windDirection: 180,
          precipitation: 0,
          isRaining: false,
        },
        forecast: [],
        error: String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Map Yr.no symbol codes to simple conditions
function mapCondition(symbolCode: string): string {
  if (symbolCode.includes("clearsky")) return "Clear";
  if (symbolCode.includes("fair")) return "Clear";
  if (symbolCode.includes("cloudy")) return "Clouds";
  if (symbolCode.includes("partlycloudy")) return "Clouds";
  if (symbolCode.includes("fog")) return "Fog";
  if (symbolCode.includes("rain") || symbolCode.includes("shower")) return "Rain";
  if (symbolCode.includes("thunder")) return "Thunderstorm";
  if (symbolCode.includes("snow") || symbolCode.includes("sleet")) return "Snow";
  return "Clouds";
}
