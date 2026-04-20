ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_email text NOT NULL DEFAULT '';