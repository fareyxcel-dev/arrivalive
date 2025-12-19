const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lat = 4.1755;
    const lon = 73.5093;
    
    // Try WeatherStack first
    const weatherStackKey = Deno.env.get("WEATHERSTACK_API_KEY");
    const openWeatherKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    
    let weatherData = null;
    
    if (weatherStackKey) {
      try {
        const url = `http://api.weatherstack.com/current?access_key=${weatherStackKey}&query=${lat},${lon}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.current) {
          weatherData = {
            temp: data.current.temperature,
            condition: data.current.weather_descriptions?.[0] || "Clear",
            humidity: data.current.humidity,
            windSpeed: data.current.wind_speed / 3.6, // km/h to m/s
            windDirection: data.current.wind_degree,
            precipitation: data.current.precip || 0,
            isRaining: data.current.precip > 0 || data.current.weather_code >= 300,
          };
          console.log("Weather from WeatherStack:", weatherData);
        }
      } catch (e) {
        console.error("WeatherStack error:", e);
      }
    }
    
    // Fallback to OpenWeatherMap
    if (!weatherData && openWeatherKey) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.main) {
          const isRaining = data.weather?.[0]?.main?.toLowerCase().includes("rain") || 
                           data.rain?.["1h"] > 0;
          weatherData = {
            temp: Math.round(data.main.temp),
            condition: data.weather?.[0]?.main || "Clear",
            humidity: data.main.humidity,
            windSpeed: data.wind?.speed || 0,
            windDirection: data.wind?.deg || 180,
            precipitation: data.rain?.["1h"] || 0,
            isRaining,
          };
          console.log("Weather from OpenWeatherMap:", weatherData);
        }
      } catch (e) {
        console.error("OpenWeatherMap error:", e);
      }
    }
    
    // Final fallback
    if (!weatherData) {
      weatherData = {
        temp: 30,
        condition: "Clouds",
        humidity: 75,
        windSpeed: 5,
        windDirection: 180,
        precipitation: 0,
        isRaining: false,
      };
    }

    return new Response(
      JSON.stringify({ current: weatherData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weather error:", error);
    return new Response(
      JSON.stringify({
        current: { temp: 30, condition: "Clouds", humidity: 75, windSpeed: 5, windDirection: 180, precipitation: 0, isRaining: false },
        error: String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
