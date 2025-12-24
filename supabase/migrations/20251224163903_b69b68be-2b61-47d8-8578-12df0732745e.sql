-- Add push_subscription column to profiles table for storing Web Push subscription data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription jsonb;