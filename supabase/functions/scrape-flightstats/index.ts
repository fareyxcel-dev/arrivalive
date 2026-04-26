// Scrape FlightStats arrivals for MLE every ~20 minutes, hide codeshares,
// compute durations using the simple "minutes after midnight" method,
// and upsert into public.flight_routes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IATA -> IANA timezone (extend as needed; unknown ones default to UTC + log).
const ORIGIN_TZ: Record<string, string> = {
  DXB: "Asia/Dubai",
  AUH: "Asia/Dubai",
  DOH: "Asia/Qatar",
  KWI: "Asia/Kuwait",
  RUH: "Asia/Riyadh",
  JED: "Asia/Riyadh",
  IST: "Europe/Istanbul",
  FRA: "Europe/Berlin",
  MUC: "Europe/Berlin",
  ZRH: "Europe/Zurich",
  VIE: "Europe/Vienna",
  LHR: "Europe/London",
  CDG: "Europe/Paris",
  AMS: "Europe/Amsterdam",
  MXP: "Europe/Rome",
  FCO: "Europe/Rome",
  WAW: "Europe/Warsaw",
  HKG: "Asia/Hong_Kong",
  PEK: "Asia/Shanghai",
  PVG: "Asia/Shanghai",
  CAN: "Asia/Shanghai",
  CTU: "Asia/Shanghai",
  CKG: "Asia/Shanghai",
  KMG: "Asia/Shanghai",
  XMN: "Asia/Shanghai",
  CGO: "Asia/Shanghai",
  TPE: "Asia/Taipei",
  ICN: "Asia/Seoul",
  NRT: "Asia/Tokyo",
  HND: "Asia/Tokyo",
  KUL: "Asia/Kuala_Lumpur",
  PEN: "Asia/Kuala_Lumpur",
  SIN: "Asia/Singapore",
  BKK: "Asia/Bangkok",
  DMK: "Asia/Bangkok",
  CMB: "Asia/Colombo",
  BOM: "Asia/Kolkata",
  DEL: "Asia/Kolkata",
  COK: "Asia/Kolkata",
  BLR: "Asia/Kolkata",
  MAA: "Asia/Kolkata",
  TRV: "Asia/Kolkata",
  HYD: "Asia/Kolkata",
  CCU: "Asia/Kolkata",
  AMD: "Asia/Kolkata",
  TAS: "Asia/Tashkent",
  GYD: "Asia/Baku",
  ALA: "Asia/Almaty",
  DAC: "Asia/Dhaka",
  CTG: "Asia/Dhaka",
  MLE: "Indian/Maldives",
  GAN: "Indian/Maldives",
  HAQ: "Indian/Maldives",
  VRA: "Indian/Maldives",
  KDM: "Indian/Maldives",
  IFU: "Indian/Maldives",
};

interface ScrapedRow {
  flight_iata: string;
  origin_iata: string | null;
  origin_name: string | null;
  depart_local: string | null; // HH:MM
  depart_tz: string | null;
  arrive_local: string | null; // HH:MM
  arrive_tz: string;
  codeshare: boolean;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function timeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// Build a UTC ISO string for a wall-clock time on a given date in a given IANA timezone.
function buildUTC(dateISO: string, hhmm: string, tz: string): string | null {
  try {
    const [hh, mm] = hhmm.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    // Build a "naive" UTC date for that wall clock then offset by tz
    const naiveUTC = Date.UTC(
      parseInt(dateISO.slice(0, 4)),
      parseInt(dateISO.slice(5, 7)) - 1,
      parseInt(dateISO.slice(8, 10)),
      hh,
      mm,
      0,
    );
    // Determine the tz offset at that instant
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date(naiveUTC));
    const get = (k: string) => parts.find((p) => p.type === k)?.value || "0";
    const asUTC = Date.UTC(
      parseInt(get("year")),
      parseInt(get("month")) - 1,
      parseInt(get("day")),
      parseInt(get("hour")),
      parseInt(get("minute")),
      0,
    );
    const offsetMs = asUTC - naiveUTC;
    return new Date(naiveUTC - offsetMs).toISOString();
  } catch (e) {
    console.warn("buildUTC error", e);
    return null;
  }
}

function parseFlightStatsHTML(html: string): ScrapedRow[] {
  const rows: ScrapedRow[] = [];

  // FlightStats v2 embeds JSON in __NEXT_DATA__
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) {
    console.warn("__NEXT_DATA__ not found in FlightStats HTML");
    return rows;
  }

  let data: any;
  try {
    data = JSON.parse(m[1]);
  } catch (e) {
    console.warn("Failed to parse __NEXT_DATA__", e);
    return rows;
  }

  // Walk the tree to find arrival flight rows. Structure varies; defensively
  // check several locations.
  const searchSpace: any[] = [];
  const queue: any[] = [data];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) {
      // arrays of objects with "carrier", "departureAirport", "arrivalTime"...
      const looksLikeFlights = node.length && node[0] && typeof node[0] === "object" &&
        ("carrier" in node[0] || "flightNumber" in node[0] ||
          "departureAirport" in node[0]);
      if (looksLikeFlights) searchSpace.push(node);
      else node.forEach((x) => queue.push(x));
    } else {
      Object.values(node).forEach((v) => queue.push(v));
    }
  }

  const seen = new Set<string>();
  for (const arr of searchSpace) {
    for (const row of arr) {
      try {
        const carrier = row.carrier?.iata ||
          row.operatedBy?.iata ||
          row.airline?.iata;
        const number = row.flightNumber || row.number;
        if (!carrier || !number) continue;
        const flight_iata = `${carrier}${number}`.toUpperCase();
        const dep = row.departureAirport || {};
        const arr2 = row.arrivalAirport || {};
        const codeshare = !!(row.isCodeshare ||
          row.codeshares?.length ||
          row.operatedBy?.iata && row.carrier?.iata &&
            row.operatedBy.iata !== row.carrier.iata);
        const departTimeRaw = row.departureTime?.time24 ||
          row.departureTime?.time ||
          row.departureTimePublished?.time24 ||
          row.scheduledDepartureTime?.time24;
        const arriveTimeRaw = row.arrivalTime?.time24 ||
          row.arrivalTime?.time ||
          row.scheduledArrivalTime?.time24;

        const key = `${flight_iata}|${dep.iata || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        rows.push({
          flight_iata,
          origin_iata: dep.iata || null,
          origin_name: dep.name || dep.city || null,
          depart_local: departTimeRaw || null,
          depart_tz: ORIGIN_TZ[dep.iata] || null,
          arrive_local: arriveTimeRaw || null,
          arrive_tz: "Indian/Maldives",
          codeshare,
        });
      } catch (e) {
        // skip malformed row
      }
    }
  }

  return rows;
}

async function fetchDate(dateISO: string): Promise<string> {
  const [y, mo, d] = dateISO.split("-");
  const url =
    `https://www.flightstats.com/v2/flight-tracker/arrivals/MLE/?codeshare=hidden&year=${y}&month=${
      parseInt(mo)
    }&date=${parseInt(d)}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ArrivaBot/1.0; +https://arrivalive.lovable.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`FlightStats fetch ${dateISO} failed ${res.status}`);
  }
  return await res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const dates = [0, 1].map((offset) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + offset);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${
        pad(d.getUTCDate())
      }`;
    });

    let totalUpserted = 0;
    let totalSkippedCodeshare = 0;

    for (const dateISO of dates) {
      try {
        const html = await fetchDate(dateISO);
        const rows = parseFlightStatsHTML(html);
        console.log(`Parsed ${rows.length} rows for ${dateISO}`);

        const upserts = [];
        for (const r of rows) {
          if (r.codeshare) {
            totalSkippedCodeshare++;
            continue;
          }
          if (!r.depart_local || !r.arrive_local) continue;

          // Simple Duration Method
          const dep = timeToMinutes(r.depart_local)!;
          let arr = timeToMinutes(r.arrive_local)!;
          if (arr < dep) arr += 24 * 60;
          const duration_minutes = arr - dep;

          const tzDep = r.depart_tz || r.arrive_tz;
          const depart_at = buildUTC(dateISO, r.depart_local, tzDep);
          const arrive_at = buildUTC(dateISO, r.arrive_local, r.arrive_tz);
          // If arrival rolled over midnight in destination tz, push one day
          let arriveISO = arrive_at;
          if (arriveISO && depart_at && new Date(arriveISO) < new Date(depart_at)) {
            const nextDay = new Date(arriveISO);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            arriveISO = nextDay.toISOString();
          }

          upserts.push({
            flight_iata: r.flight_iata,
            flight_date: dateISO,
            origin_iata: r.origin_iata,
            origin_name: r.origin_name,
            depart_local: r.depart_local,
            depart_tz: tzDep,
            arrive_local: r.arrive_local,
            arrive_tz: r.arrive_tz,
            depart_at,
            arrive_at: arriveISO,
            duration_minutes,
            codeshare: false,
            fetched_at: new Date().toISOString(),
          });
        }

        if (upserts.length) {
          const { error } = await supabase
            .from("flight_routes")
            .upsert(upserts, { onConflict: "flight_iata,flight_date" });
          if (error) {
            console.error("Upsert error", error);
          } else {
            totalUpserted += upserts.length;
          }
        }
      } catch (e) {
        console.error(`Date ${dateISO} failed`, e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        upserted: totalUpserted,
        skipped_codeshare: totalSkippedCodeshare,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("scrape-flightstats fatal:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
