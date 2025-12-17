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
  
  // Parse date headers - they appear as "Thursday 18 Dec, 2025" in sumheadtop class
  const dateHeaderPattern = /<tr[^>]*class="sumheadtop"[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>/gi;
  const dateHeaders: { index: number; date: string }[] = [];
  
  let dateMatch;
  while ((dateMatch = dateHeaderPattern.exec(html)) !== null) {
    const dateText = dateMatch[1].trim();
    const parsedDate = parseDateHeader(dateText);
    if (parsedDate) {
      dateHeaders.push({ index: dateMatch.index, date: parsedDate });
    }
  }
  
  // If no date headers found, use today
  if (dateHeaders.length === 0) {
    dateHeaders.push({ index: 0, date: new Date().toISOString().split("T")[0] });
  }
  
  console.log(`Found ${dateHeaders.length} date headers:`, dateHeaders.map(d => d.date));

  // Match rows with schedulerow or schedulerowtwo class
  const rowPattern = /<tr[^>]*class="schedule(?:row|rowtwo)"[^>]*valign="top"[^>]*>([\s\S]*?)(?=<tr[^>]*class="schedule|<tr[^>]*class="sumhead|<\/table)/gi;
  
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const rowIndex = rowMatch.index;
    
    // Determine which date this row belongs to
    let flightDate = dateHeaders[0].date;
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      if (rowIndex > dateHeaders[i].index) {
        flightDate = dateHeaders[i].date;
        break;
      }
    }
    
    // Extract airline code from logo URL (e.g., /webfids/images/q2.gif -> Q2)
    const logoMatch = rowHtml.match(/src="[^"]*\/([a-z0-9]+)\.gif"/i);
    const airlineCode = logoMatch ? logoMatch[1].toUpperCase() : "";
    
    // Extract flight number from td.flight
    const flightMatch = rowHtml.match(/<td[^>]*class="flight"[^>]*[^<]*>([^<]+)<\/td>/i);
    const flightId = flightMatch ? flightMatch[1].trim() : "";
    
    // Extract origin from td.city
    const cityMatch = rowHtml.match(/<td[^>]*class="city"[^>]*>([^<]+)<\/td>/i);
    const origin = cityMatch ? cityMatch[1].trim().replace(/\s+$/, '') : "";
    
    // Extract scheduled time from td.time
    const timeMatch = rowHtml.match(/<td[^>]*class="time"[^>]*>([^<]+)<\/td>/i);
    const scheduledTime = timeMatch ? timeMatch[1].trim() : "";
    
    // Extract estimated time from td.estimated
    const estimatedMatch = rowHtml.match(/<td[^>]*class="estimated"[^>]*>([^<]+)<\/td>/i);
    const estimatedTime = estimatedMatch ? estimatedMatch[1].trim() : "";
    
    // Extract terminal from td.terminal
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
        flight_date: flightDate,
      });
    }
  }

  console.log(`Parsed flights: ${JSON.stringify(flights.slice(0, 3))}...`);
  return flights;
}

function parseDateHeader(dateText: string): string | null {
  // Parse "Thursday 18 Dec, 2025" format
  const match = dateText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*(\d{4})/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    const month = months[monthStr];
    if (month !== undefined) {
      const date = new Date(year, month, day);
      return date.toISOString().split("T")[0];
    }
  }
  return null;
}

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
