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

// Parse date text like "Wednesday 17 Dec, 2025" → "2025-12-17"
function parseDateText(dateText: string): string | null {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // Match patterns like "17 Dec, 2025" or "17 Dec 2025"
  const match = dateText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s*(\d{4})/i);
  if (!match) return null;
  
  const day = match[1].padStart(2, '0');
  const month = months[match[2]];
  const year = match[3];
  
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function parseFlightData(html: string): FlightData[] {
  const flights: FlightData[] = [];
  
  // Track current date as we walk through the HTML
  let currentDateISO: string | null = null;
  
  // First, find all date headers with class="sumheadtop"
  // Pattern: <td colspan="7" class="sumheadtop">Wednesday 17 Dec, 2025&nbsp;</td>
  const dateHeaderPattern = /<td[^>]*class="sumheadtop"[^>]*>([\s\S]*?)<\/td>/gi;
  const datePositions: Array<{position: number, date: string}> = [];
  
  let dateMatch;
  while ((dateMatch = dateHeaderPattern.exec(html)) !== null) {
    const headerText = dateMatch[1].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
    const parsedDate = parseDateText(headerText);
    if (parsedDate) {
      datePositions.push({ position: dateMatch.index, date: parsedDate });
      console.log(`Found date header at position ${dateMatch.index}: "${headerText}" → ${parsedDate}`);
    }
  }
  
  if (datePositions.length === 0) {
    console.log("No date headers found!");
    return [];
  }
  
  // Now find all flight rows
  // Pattern: <tr class="schedulerow" valign="top"> or <tr class="schedulerowtwo" valign="top">
  const flightRowPattern = /<tr[^>]*class="(?:schedulerow|schedulerowtwo)"[^>]*valign="top"[^>]*>([\s\S]*?)<\/tr>/gi;
  
  let rowMatch;
  while ((rowMatch = flightRowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const rowPosition = rowMatch.index;
    
    // Determine which date this row belongs to (find the most recent date header before this row)
    let flightDate = datePositions[0].date; // Default to first date
    for (const dp of datePositions) {
      if (dp.position < rowPosition) {
        flightDate = dp.date;
      } else {
        break;
      }
    }
    
    // Extract cells by class name
    const getCellContent = (className: string): string => {
      const cellPattern = new RegExp(`<td[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
      const match = rowHtml.match(cellPattern);
      if (!match) return '';
      return match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };
    
    // Extract status from div.status inside the last td
    const getStatus = (): string => {
      const statusMatch = rowHtml.match(/<div[^>]*class="status"[^>]*>([\s\S]*?)<\/div>/i);
      if (!statusMatch) return '-';
      const status = statusMatch[1].replace(/&nbsp;/g, ' ').trim();
      return status || '-';
    };
    
    const flightId = getCellContent('flight');
    const origin = getCellContent('city');
    const scheduledTime = getCellContent('time');
    const estimatedTime = getCellContent('estimated');
    const terminal = getCellContent('terminal').replace(/\s+/g, '') || 'T1';
    const status = getStatus();
    
    // Validate flight ID
    if (!flightId || !/^[A-Z0-9]{2}\s?\d+/i.test(flightId)) continue;
    if (!scheduledTime) continue;
    
    const airlineCode = flightId.substring(0, 2).toUpperCase();
    
    flights.push({
      flight_id: flightId,
      airline_code: airlineCode,
      origin: origin || 'Unknown',
      scheduled_time: scheduledTime,
      estimated_time: estimatedTime || null,
      actual_time: null,
      terminal: terminal,
      status: status,
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
