-- Add preferences columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS preferred_theme text DEFAULT 'system';
