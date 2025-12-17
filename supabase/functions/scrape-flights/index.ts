import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlightData {
  flight_id: string;
  airline_code: string;
  origin: string;
  scheduled_time: string;
  estimated_time: string | null;
  actual_time: string | null;
  terminal: string;
  status: string;
  flight_date: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching flight data from fis.com.mv...");

    // Fetch the HTML from fis.com.mv arrivals page with correct URL
    const response = await fetch(
      "https://fis.com.mv/index.php?webfids_type=arrivals&webfids_lang=1&webfids_domesticinternational=both&webfids_passengercargo=passenger&webfids_airline=ALL&webfids_waypoint=ALL&Submit=+UPDATE+",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML fetched, length: ${html.length} chars`);

    // Parse flight data from HTML
    const flights = parseFlightData(html);
    console.log(`Parsed ${flights.length} flights`);

    if (flights.length === 0) {
      console.log("No flights parsed, returning mock data");
      const mockFlights = getMockFlights();
      return new Response(JSON.stringify({ flights: mockFlights, source: "mock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for status changes before upsert
    const today = new Date().toISOString().split("T")[0];
    const { data: existingFlights } = await supabase
      .from("flights")
      .select("*")
      .eq("flight_date", today);

    const statusChanges: Array<{ flight: FlightData; oldStatus: string; newStatus: string }> = [];

    if (existingFlights) {
      for (const newFlight of flights) {
        const existing = existingFlights.find(
          (f) => f.flight_id === newFlight.flight_id && f.flight_date === newFlight.flight_date
        );
        if (existing && existing.status !== newFlight.status) {
          statusChanges.push({
            flight: newFlight,
            oldStatus: existing.status,
            newStatus: newFlight.status,
          });
        }
      }
    }

    // Deduplicate flights by flight_id + flight_date
    const uniqueFlights = flights.reduce((acc, f) => {
      const key = `${f.flight_id}_${f.flight_date}`;
      if (!acc.has(key)) acc.set(key, f);
      return acc;
    }, new Map<string, FlightData>());

    // Upsert flights to database
    const { error: upsertError } = await supabase
      .from("flights")
      .upsert(
        Array.from(uniqueFlights.values()).map((f) => ({
          flight_id: f.flight_id,
          airline_code: f.airline_code,
          origin: f.origin,
          scheduled_time: f.scheduled_time,
          estimated_time: f.estimated_time,
          actual_time: f.actual_time,
          terminal: f.terminal,
          status: f.status,
          flight_date: f.flight_date,
        })),
        { onConflict: "flight_id,flight_date" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    // Trigger notifications for status changes
    if (statusChanges.length > 0) {
      console.log(`Found ${statusChanges.length} status changes, triggering notifications...`);
      
      for (const change of statusChanges) {
        await triggerNotifications(supabase, change.flight, change.oldStatus, change.newStatus);
      }
    }

    return new Response(
      JSON.stringify({ 
        flights, 
        source: "live", 
        statusChanges: statusChanges.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    
    // Return mock data on error
    const mockFlights = getMockFlights();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ flights: mockFlights, source: "mock", error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseFlightData(html: string): FlightData[] {
  const flights: FlightData[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Parse using the actual HTML structure from fis.com.mv
  // The HTML has rows with class "schedulerow" or "schedulerowtwo"
  // Each row contains: airline img, flight number, city, time, estimated, terminal, status
  
  // Match rows with schedulerow or schedulerowtwo class
  const rowPattern = /<tr[^>]*class="schedule(?:row|rowtwo)"[^>]*valign="top"[^>]*>([\s\S]*?)(?=<tr[^>]*class="schedule|<\/table)/gi;
  
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    
    // Extract airline code from logo URL (e.g., /webfids/images/q2.gif -> Q2)
    const logoMatch = rowHtml.match(/src="[^"]*\/([a-z0-9]+)\.gif"/i);
    const airlineCode = logoMatch ? logoMatch[1].toUpperCase() : "";
    
    // Extract flight number from td.flight
    const flightMatch = rowHtml.match(/<td[^>]*class="flight"[^>]*[^<]*>([^<]+)<\/td>/i);
    const flightId = flightMatch ? flightMatch[1].trim() : "";
    
    // Extract origin from td.city (clean trailing spaces)
    const cityMatch = rowHtml.match(/<td[^>]*class="city"[^>]*>([^<]+)<\/td>/i);
    const origin = cityMatch ? cityMatch[1].trim().replace(/\s+$/, '') : "";
    
    // Extract scheduled time from td.time
    const timeMatch = rowHtml.match(/<td[^>]*class="time"[^>]*>([^<]+)<\/td>/i);
    const scheduledTime = timeMatch ? timeMatch[1].trim() : "";
    
    // Extract estimated time from td.estimated
    const estimatedMatch = rowHtml.match(/<td[^>]*class="estimated"[^>]*>([^<]+)<\/td>/i);
    const estimatedTime = estimatedMatch ? estimatedMatch[1].trim() : "";
    
    // Extract terminal from td.terminal (clean HTML entities)
    const terminalMatch = rowHtml.match(/<td[^>]*class="terminal"[^>]*>([^<]+)<\/td>/i);
    let terminal = terminalMatch ? terminalMatch[1].trim() : "T1";
    terminal = terminal.replace(/&nbsp;/gi, '').replace(/\u00A0/g, '').trim();
    if (!terminal) terminal = "T1";
    
    // Extract status from div.status
    const statusMatch = rowHtml.match(/<div[^>]*class="status"[^>]*>([^<]+)<\/div>/i);
    const status = statusMatch ? statusMatch[1].trim() : "-";
    
    if (flightId && /^[A-Z0-9]{2}\s?\d+/i.test(flightId)) {
      flights.push({
        flight_id: flightId,
        airline_code: airlineCode || flightId.substring(0, 2).toUpperCase(),
        origin: origin || "Unknown",
        scheduled_time: scheduledTime || "00:00",
        estimated_time: estimatedTime || null,
        actual_time: null,
        terminal: terminal || "T1",
        status: status || "-",
        flight_date: today,
      });
    }
  }

  // Alternative simpler parsing if the above doesn't work
  if (flights.length === 0) {
    console.log("Trying alternative parsing...");
    
    // Look for pattern: flight class with flight number
    const simplePattern = /<td[^>]*class="flight"[^>]*nowrap[^>]*>([^<]+)<\/td>\s*<td[^>]*class="city"[^>]*>([^<]+)<\/td>\s*<td[^>]*class="time"[^>]*>([^<]+)<\/td>\s*<td[^>]*class="estimated"[^>]*>([^<]+)<\/td>\s*<td[^>]*class="terminal"[^>]*>([^<]+)<\/td>\s*<td[^>]*>[^<]*<div[^>]*class="status"[^>]*>([^<]*)<\/div>/gi;
    
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(html)) !== null) {
      const flightId = simpleMatch[1].trim();
      flights.push({
        flight_id: flightId,
        airline_code: flightId.substring(0, 2).toUpperCase().replace(/\s/g, ''),
        origin: simpleMatch[2].trim(),
        scheduled_time: simpleMatch[3].trim(),
        estimated_time: simpleMatch[4].trim() || null,
        actual_time: null,
        terminal: simpleMatch[5].trim() || "T1",
        status: simpleMatch[6].trim() || "-",
        flight_date: today,
      });
    }
  }

  // Final fallback - parse line by line looking for flight patterns
  if (flights.length === 0) {
    console.log("Trying line-by-line parsing...");
    
    // Match flight numbers followed by city data
    const lines = html.split('\n');
    let currentFlight: Partial<FlightData> = {};
    
    for (const line of lines) {
      const flightMatch = line.match(/class="flight"[^>]*>([A-Z0-9]{2}\s?\d+)/i);
      if (flightMatch) {
        if (currentFlight.flight_id) {
          flights.push({
            flight_id: currentFlight.flight_id,
            airline_code: currentFlight.airline_code || currentFlight.flight_id.substring(0, 2),
            origin: currentFlight.origin || "Unknown",
            scheduled_time: currentFlight.scheduled_time || "00:00",
            estimated_time: currentFlight.estimated_time || null,
            actual_time: null,
            terminal: currentFlight.terminal || "T1",
            status: currentFlight.status || "-",
            flight_date: today,
          });
        }
        currentFlight = { flight_id: flightMatch[1].trim(), airline_code: flightMatch[1].substring(0, 2).toUpperCase() };
      }
      
      const cityMatch = line.match(/class="city">([^<]+)/i);
      if (cityMatch && currentFlight.flight_id) currentFlight.origin = cityMatch[1].trim();
      
      const timeMatch = line.match(/class="time">([^<]+)/i);
      if (timeMatch && currentFlight.flight_id) currentFlight.scheduled_time = timeMatch[1].trim();
      
      const estMatch = line.match(/class="estimated">([^<]+)/i);
      if (estMatch && currentFlight.flight_id) currentFlight.estimated_time = estMatch[1].trim();
      
      const termMatch = line.match(/class="terminal">([^<]+)/i);
      if (termMatch && currentFlight.flight_id) currentFlight.terminal = termMatch[1].trim();
      
      const statusMatch = line.match(/class="status">([^<]+)/i);
      if (statusMatch && currentFlight.flight_id) {
        currentFlight.status = statusMatch[1].trim();
        // Push completed flight
        flights.push({
          flight_id: currentFlight.flight_id,
          airline_code: currentFlight.airline_code || currentFlight.flight_id.substring(0, 2),
          origin: currentFlight.origin || "Unknown",
          scheduled_time: currentFlight.scheduled_time || "00:00",
          estimated_time: currentFlight.estimated_time || null,
          actual_time: null,
          terminal: currentFlight.terminal || "T1",
          status: currentFlight.status || "-",
          flight_date: today,
        });
        currentFlight = {};
      }
    }
  }

  console.log(`Parsed flights: ${JSON.stringify(flights.slice(0, 3))}...`);
  return flights;
}

function getMockFlights(): FlightData[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { flight_id: "Q2 707", airline_code: "Q2", origin: "Cochin", scheduled_time: "12:30", estimated_time: "12:25", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "VP 605", airline_code: "VP", origin: "Maamigili", scheduled_time: "12:30", estimated_time: "13:16", actual_time: null, terminal: "DOM", status: "LANDED", flight_date: today },
    { flight_id: "TK 734", airline_code: "TK", origin: "Istanbul", scheduled_time: "12:35", estimated_time: "12:34", actual_time: null, terminal: "T2", status: "LANDED", flight_date: today },
    { flight_id: "BS 337", airline_code: "BS", origin: "Dhaka", scheduled_time: "12:50", estimated_time: "13:08", actual_time: null, terminal: "T1", status: "DELAYED", flight_date: today },
    { flight_id: "6E 1129", airline_code: "6E", origin: "Trivandrum", scheduled_time: "13:15", estimated_time: "13:19", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "G9 091", airline_code: "G9", origin: "Sharjah", scheduled_time: "13:20", estimated_time: "13:17", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "EY 376", airline_code: "EY", origin: "Abu Dhabi", scheduled_time: "13:50", estimated_time: "13:32", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "EK 652", airline_code: "EK", origin: "Dubai", scheduled_time: "14:30", estimated_time: "14:30", actual_time: null, terminal: "T1", status: "-", flight_date: today },
    { flight_id: "SQ 452", airline_code: "SQ", origin: "Singapore", scheduled_time: "15:15", estimated_time: "15:15", actual_time: null, terminal: "T2", status: "-", flight_date: today },
    { flight_id: "QR 674", airline_code: "QR", origin: "Doha", scheduled_time: "16:00", estimated_time: "16:00", actual_time: null, terminal: "T2", status: "-", flight_date: today },
    { flight_id: "Q2 401", airline_code: "Q2", origin: "Gan Island", scheduled_time: "17:00", estimated_time: "17:00", actual_time: null, terminal: "DOM", status: "-", flight_date: today },
    { flight_id: "Q2 501", airline_code: "Q2", origin: "Kaadedhdhoo", scheduled_time: "18:30", estimated_time: "18:30", actual_time: null, terminal: "DOM", status: "CANCELLED", flight_date: today },
  ];
}

async function triggerNotifications(
  supabase: any,
  flight: FlightData,
  oldStatus: string,
  newStatus: string
) {
  // Get subscriptions for this flight
  const { data: subscriptions } = await supabase
    .from("notification_subscriptions")
    .select("*, profiles(*)")
    .eq("flight_id", flight.flight_id)
    .eq("flight_date", flight.flight_date);

  if (!subscriptions || subscriptions.length === 0) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  for (const sub of subscriptions) {
    const message = `Flight ${flight.flight_id} from ${flight.origin}: Status changed from ${oldStatus} to ${newStatus}`;

    // Trigger notification edge function
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription: sub,
        flight,
        message,
        oldStatus,
        newStatus,
      }),
    });
  }
}
