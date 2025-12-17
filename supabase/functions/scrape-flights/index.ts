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

    const response = await fetch(
      "https://fis.com.mv/index.php?webfids_type=arrivals&webfids_lang=1&webfids_domesticinternational=both&webfids_passengercargo=passenger&webfids_airline=ALL&webfids_waypoint=ALL&Submit=+UPDATE+",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML fetched, length: ${html.length} chars`);

    const flights = parseFlightData(html);
    console.log(`Parsed ${flights.length} flights`);

    if (flights.length === 0) {
      return new Response(JSON.stringify({ flights: getMockFlights(), source: "mock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for status changes
    const flightDates = [...new Set(flights.map(f => f.flight_date))];
    const { data: existingFlights } = await supabase
      .from("flights")
      .select("*")
      .in("flight_date", flightDates);

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

    // Deduplicate and upsert
    const uniqueFlights = new Map<string, FlightData>();
    for (const f of flights) {
      const key = `${f.flight_id}_${f.flight_date}`;
      if (!uniqueFlights.has(key)) {
        uniqueFlights.set(key, f);
      }
    }

    const { error: upsertError } = await supabase
      .from("flights")
      .upsert(Array.from(uniqueFlights.values()), { onConflict: "flight_id,flight_date" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    // Trigger notifications for status changes
    if (statusChanges.length > 0) {
      console.log(`${statusChanges.length} status changes`);
      for (const change of statusChanges) {
        await triggerNotifications(supabase, change.flight, change.oldStatus, change.newStatus);
      }
    }

    return new Response(
      JSON.stringify({ flights, source: "live", statusChanges: statusChanges.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ flights: getMockFlights(), source: "mock", error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseFlightData(html: string): FlightData[] {
  const flights: FlightData[] = [];
  
  // Find all table rows
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    
    // Extract all td elements
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
      // Strip HTML tags and clean text
      const text = tdMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      tds.push(text);
    }
    
    // Skip rows that don't have 7+ columns (flight data rows)
    if (tds.length < 7) continue;
    
    const flightId = tds[0].trim();
    const origin = tds[1].trim();
    const dateStr = tds[2].trim();           // DD/MM/YYYY
    const scheduledTime = tds[3].trim();     // HH:mm
    const estimatedTime = tds[4].trim();     // HH:mm or empty
    const terminal = tds[5].trim() || 'T1';
    const status = tds[6].trim() || '-';
    
    // Validate this is a flight row (flight ID should match pattern like "Q2 123")
    if (!flightId || !/^[A-Z0-9]{2}\s?\d+/i.test(flightId)) continue;
    
    // Validate and parse date (DD/MM/YYYY)
    if (!dateStr || !scheduledTime) continue;
    const dateParts = dateStr.split('/');
    if (dateParts.length !== 3) continue;
    
    const [day, month, year] = dateParts;
    const flightDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Extract airline code from flight ID
    const airlineCode = flightId.substring(0, 2).toUpperCase();
    
    flights.push({
      flight_id: flightId,
      airline_code: airlineCode,
      origin: origin || "Unknown",
      scheduled_time: scheduledTime,
      estimated_time: estimatedTime || null,
      actual_time: null,
      terminal: terminal.replace(/\s+/g, '') || "T1",
      status: status || "-",
      flight_date: flightDate,
    });
  }

  console.log(`Parsed ${flights.length} flights`);
  if (flights.length > 0) {
    console.log(`First flight: ${JSON.stringify(flights[0])}`);
    console.log(`Dates found: ${[...new Set(flights.map(f => f.flight_date))].join(', ')}`);
  }
  return flights;
}

// Removed - no longer needed since we parse dates directly from table cells

function getMockFlights(): FlightData[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { flight_id: "Q2 707", airline_code: "Q2", origin: "Cochin", scheduled_time: "12:30", estimated_time: "12:25", actual_time: null, terminal: "T1", status: "LANDED", flight_date: today },
    { flight_id: "VP 605", airline_code: "VP", origin: "Maamigili", scheduled_time: "12:30", estimated_time: "13:16", actual_time: null, terminal: "DOM", status: "LANDED", flight_date: today },
    { flight_id: "TK 734", airline_code: "TK", origin: "Istanbul", scheduled_time: "12:35", estimated_time: "12:34", actual_time: null, terminal: "T2", status: "LANDED", flight_date: today },
    { flight_id: "EK 652", airline_code: "EK", origin: "Dubai", scheduled_time: "14:30", estimated_time: "14:30", actual_time: null, terminal: "T1", status: "-", flight_date: today },
    { flight_id: "SQ 452", airline_code: "SQ", origin: "Singapore", scheduled_time: "15:15", estimated_time: "15:15", actual_time: null, terminal: "T2", status: "-", flight_date: today },
  ];
}

async function triggerNotifications(
  supabase: any,
  flight: FlightData,
  oldStatus: string,
  newStatus: string
) {
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
    
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscription: sub, flight, message, oldStatus, newStatus }),
    });
  }
}
