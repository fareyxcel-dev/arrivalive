const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlightPosition {
  progress: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flightId, scheduledTime, flightDate } = await req.json();
    
    if (!flightId) {
      return new Response(
        JSON.stringify({ error: "flightId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FLIGHTAWARE_API_KEY");
    if (!apiKey) {
      console.error("FLIGHTAWARE_API_KEY not configured");
      return new Response(
        JSON.stringify({ progress: 0, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate hours until landing
    const now = new Date();
    const [hours, minutes] = (scheduledTime || "00:00").split(":").map(Number);
    const scheduled = new Date(flightDate + "T00:00:00+05:00");
    scheduled.setHours(hours, minutes, 0, 0);
    const hoursUntilLanding = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Don't track if more than 5 hours away or already landed
    if (hoursUntilLanding > 5 || hoursUntilLanding < 0) {
      return new Response(
        JSON.stringify({ progress: 0, shouldTrack: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Tracking flight ${flightId}, ${hoursUntilLanding.toFixed(1)} hours until landing`);

    // FlightAware AeroAPI endpoint
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/${flightId}/position`;
    
    const response = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`FlightAware API error: ${response.status}`);
      
      // Estimate progress based on time
      const estimatedProgress = Math.max(0, Math.min(100, ((5 - hoursUntilLanding) / 5) * 100));
      
      return new Response(
        JSON.stringify({ 
          progress: Math.round(estimatedProgress),
          estimated: true,
          shouldTrack: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Calculate progress from position data
    let progress = 0;
    if (data.last_position) {
      const pos = data.last_position;
      
      // If we have progress percentage from API
      if (pos.progress_percent !== undefined) {
        progress = pos.progress_percent;
      } else if (pos.altitude !== undefined) {
        // Estimate based on altitude and time
        // Cruising altitude ~35000ft, descent starts ~30min before landing
        if (pos.altitude > 30000) {
          progress = Math.min(80, ((5 - hoursUntilLanding) / 5) * 80);
        } else if (pos.altitude > 10000) {
          progress = 80 + ((30000 - pos.altitude) / 20000) * 15;
        } else {
          progress = 95 + ((10000 - pos.altitude) / 10000) * 5;
        }
      } else {
        progress = ((5 - hoursUntilLanding) / 5) * 100;
      }

      const result: FlightPosition = {
        progress: Math.round(Math.max(0, Math.min(100, progress))),
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        speed: pos.groundspeed,
        heading: pos.heading,
      };

      console.log(`Flight ${flightId} progress: ${result.progress}%`);

      return new Response(
        JSON.stringify({ ...result, shouldTrack: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to time-based estimate
    const estimatedProgress = ((5 - hoursUntilLanding) / 5) * 100;
    
    return new Response(
      JSON.stringify({ 
        progress: Math.round(Math.max(0, Math.min(100, estimatedProgress))),
        estimated: true,
        shouldTrack: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Track flight error:", error);
    return new Response(
      JSON.stringify({ progress: 0, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
