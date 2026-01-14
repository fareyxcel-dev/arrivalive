-- Add onesignal_player_id column to profiles table for push notification subscriptions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;