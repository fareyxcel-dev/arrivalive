-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  notification_email TEXT,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flights table for cached flight data
CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_id TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  origin TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  estimated_time TEXT,
  actual_time TEXT,
  terminal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '-',
  flight_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flight_id, flight_date)
);

-- Create notification_subscriptions table
CREATE TABLE public.notification_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_id TEXT NOT NULL,
  flight_date DATE NOT NULL,
  notify_sms BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, flight_id, flight_date)
);

-- Create notification_log table to track sent notifications
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  status_change TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flights policies (public read, service role write)
CREATE POLICY "Anyone can view flights" ON public.flights
  FOR SELECT USING (true);

-- Notification subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.notification_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.notification_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.notification_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Notification log policies
CREATE POLICY "Users can view their own notification logs" ON public.notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notification_subscriptions ns 
      WHERE ns.id = notification_log.subscription_id 
      AND ns.user_id = auth.uid()
    )
  );

-- Enable realtime for flights
ALTER PUBLICATION supabase_realtime ADD TABLE public.flights;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();