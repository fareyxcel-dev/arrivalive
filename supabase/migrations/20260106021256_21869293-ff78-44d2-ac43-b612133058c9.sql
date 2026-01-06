-- Create app_updates table for "What's New" content
CREATE TABLE public.app_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  release_date DATE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view public updates
CREATE POLICY "Anyone can view public updates"
ON public.app_updates FOR SELECT
USING (is_public = true);

-- Only admins can manage updates
CREATE POLICY "Admins can manage updates"
ON public.app_updates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_app_updates_updated_at
BEFORE UPDATE ON public.app_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial update entry
INSERT INTO public.app_updates (version, title, description, release_date, is_public)
VALUES (
  '2.0.0',
  'Major UI Overhaul',
  'Redesigned flight cards with live blur tints, enhanced weather bar with countdown displays, improved notifications system with Alerts tab for live flight status updates, and a beautiful animated Disney-style weather background. New font picker with 200+ fonts and dynamic previews.',
  CURRENT_DATE,
  true
);