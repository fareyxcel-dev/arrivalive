-- 1. flight_routes table for the FlightStats scraper + duration tracker
CREATE TABLE IF NOT EXISTS public.flight_routes (
  flight_iata text NOT NULL,
  flight_date date NOT NULL,
  origin_iata text,
  origin_name text,
  depart_local time,
  depart_tz text,
  arrive_local time,
  arrive_tz text,
  depart_at timestamptz,
  arrive_at timestamptz,
  duration_minutes integer,
  codeshare boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (flight_iata, flight_date)
);

ALTER TABLE public.flight_routes ENABLE ROW LEVEL SECURITY;

-- Public read access; writes only via service role (no policy for write = denied to client roles)
CREATE POLICY "Anyone can view flight routes"
  ON public.flight_routes
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_flight_routes_date ON public.flight_routes (flight_date);
CREATE INDEX IF NOT EXISTS idx_flight_routes_codeshare ON public.flight_routes (codeshare);

-- 2. profiles.notification_prefs jsonb column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb
    NOT NULL
    DEFAULT '{"push":false,"telegram":false,"email":false,"sms":false}'::jsonb;

-- 3. Enable scheduling extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;