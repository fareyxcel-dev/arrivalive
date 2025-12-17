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

    // Fetch the HTML from fis.com.mv arrivals page
    const response = await fetch("https://fis.com.mv/arrivals", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    console.log("HTML fetched, parsing...");

    // Parse flight data from HTML
    const flights = parseFlightData(html);
    console.log(`Parsed ${flights.length} flights`);

    if (flights.length === 0) {
      // Return mock data if scraping fails
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

    // Upsert flights to database
    const { error: upsertError } = await supabase
      .from("flights")
      .upsert(
        flights.map((f) => ({
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

  // Parse table rows - looking for flight data patterns
  const rowPattern = /<tr[^>]*class="[^"]*flight[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const row = match[1];
    const cells: string[] = [];
    let cellMatch;

    while ((cellMatch = cellPattern.exec(row)) !== null) {
      const cellContent = cellMatch[1]
        .replace(/<[^>]+>/g, "")
        .trim();
      cells.push(cellContent);
    }

    if (cells.length >= 5) {
      const flightId = cells[0]?.trim();
      if (flightId && /^[A-Z]{2}\s?\d+/.test(flightId)) {
        flights.push({
          flight_id: flightId,
          airline_code: flightId.substring(0, 2),
          origin: cells[1]?.trim() || "Unknown",
          scheduled_time: cells[2]?.trim() || "00:00",
          estimated_time: cells[3]?.trim() || null,
          actual_time: null,
          terminal: cells[4]?.trim() || "T1",
          status: cells[5]?.trim() || "-",
          flight_date: today,
        });
      }
    }
  }

  // Alternative parsing for different HTML structures
  if (flights.length === 0) {
    const altPattern = /(\w{2}\s?\d+)\s*[\|,]\s*([^|,]+)\s*[\|,]\s*(\d{2}:\d{2})/g;
    let altMatch;
    while ((altMatch = altPattern.exec(html)) !== null) {
      flights.push({
        flight_id: altMatch[1],
        airline_code: altMatch[1].substring(0, 2),
        origin: altMatch[2].trim(),
        scheduled_time: altMatch[3],
        estimated_time: null,
        actual_time: null,
        terminal: "T1",
        status: "-",
        flight_date: today,
      });
    }
  }

  return flights;
}

function getMockFlights(): FlightData[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { flight_id: "G9 093", airline_code: "G9", origin: "Sharjah", scheduled_time: "08:10", estimated_time: "07:57", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "EK 652", airline_code: "EK", origin: "Dubai", scheduled_time: "09:30", estimated_time: "09:45", actual_time: null, terminal: "T1", status: "DELAYED", flight_date: today },
    { flight_id: "SQ 452", airline_code: "SQ", origin: "Singapore", scheduled_time: "10:15", estimated_time: "10:15", actual_time: null, terminal: "T1", status: "-", flight_date: today },
    { flight_id: "QR 674", airline_code: "QR", origin: "Doha", scheduled_time: "11:00", estimated_time: "11:00", actual_time: null, terminal: "T2", status: "-", flight_date: today },
    { flight_id: "TK 730", airline_code: "TK", origin: "Istanbul", scheduled_time: "12:30", estimated_time: "12:30", actual_time: null, terminal: "T2", status: "-", flight_date: today },
    { flight_id: "Q2 401", airline_code: "Q2", origin: "Gan Island", scheduled_time: "14:00", estimated_time: "14:00", actual_time: null, terminal: "DOM", status: "-", flight_date: today },
    { flight_id: "Q2 501", airline_code: "Q2", origin: "Kaadedhdhoo", scheduled_time: "15:30", estimated_time: "15:30", actual_time: null, terminal: "DOM", status: "CANCELLED", flight_date: today },
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