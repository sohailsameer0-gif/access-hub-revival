-- Enable delivery in Basic plan defaults
ALTER TABLE public.platform_settings
  ALTER COLUMN basic_enable_delivery SET DEFAULT true;

UPDATE public.platform_settings
   SET basic_enable_delivery = true,
       updated_at = now();
