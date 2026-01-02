-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create custom_fonts table for user font uploads
CREATE TABLE public.custom_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on custom_fonts
ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_fonts
CREATE POLICY "Anyone can view approved fonts"
ON public.custom_fonts
FOR SELECT
USING (approved = true);

CREATE POLICY "Users can view their own uploaded fonts"
ON public.custom_fonts
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can upload fonts"
ON public.custom_fonts
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can update fonts (approve/reject)"
ON public.custom_fonts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_reports table for bug reports and feature requests
CREATE TABLE public.admin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('bug', 'feature', 'feedback')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_reports
ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_reports
CREATE POLICY "Users can create reports"
ON public.admin_reports
FOR INSERT
TO authenticated
WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view their own reports"
ON public.admin_reports
FOR SELECT
TO authenticated
USING (reported_by = auth.uid());

CREATE POLICY "Admins can view all reports"
ON public.admin_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.admin_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add UPDATE policy to notification_subscriptions (was missing)
CREATE POLICY "Users can update their own subscriptions"
ON public.notification_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create flight_alerts table for tracking all flight status changes
CREATE TABLE public.flight_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id TEXT NOT NULL,
  flight_date DATE NOT NULL,
  origin TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('delayed', 'landed', 'cancelled', 'on_time')),
  old_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on flight_alerts
ALTER TABLE public.flight_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can view flight alerts (public info)
CREATE POLICY "Anyone can view flight alerts"
ON public.flight_alerts
FOR SELECT
USING (true);

-- Trigger to update updated_at on custom_fonts
CREATE TRIGGER update_custom_fonts_updated_at
BEFORE UPDATE ON public.custom_fonts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on admin_reports
CREATE TRIGGER update_admin_reports_updated_at
BEFORE UPDATE ON public.admin_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert admin role for arrivamv@gmail.com (will need user_id)
-- This will be done via a separate insert after user signs up