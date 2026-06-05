ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';
