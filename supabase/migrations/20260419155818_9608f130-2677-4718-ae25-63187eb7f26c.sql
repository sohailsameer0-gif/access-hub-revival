
-- 1. Admin payment methods table
CREATE TABLE IF NOT EXISTS public.admin_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,                 -- bank_transfer | jazzcash | easypaisa | other
  label text NOT NULL,                -- display name e.g. "HBL Bank Transfer"
  account_title text,
  account_number text,
  iban text,
  bank_name text,
  instructions text,
  qr_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_payment_methods ENABLE ROW LEVEL SECURITY;

-- Admins: full control
CREATE POLICY "Admins manage payment methods"
  ON public.admin_payment_methods
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users: can read active methods (outlet owners need this when subscribing)
CREATE POLICY "Auth users read active methods"
  ON public.admin_payment_methods
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_admin_payment_methods_updated_at
  BEFORE UPDATE ON public.admin_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Auto-approve flag on platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS auto_approve_subscriptions boolean NOT NULL DEFAULT false;

-- 3. QR storage bucket (public read for displaying QR)
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-payment-qr', 'admin-payment-qr', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read QR images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-payment-qr');

CREATE POLICY "Admins upload QR images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update QR images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete QR images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));

-- 4. Auto-approve trigger: when auto_approve_subscriptions is ON, instantly approve new pending requests
CREATE OR REPLACE FUNCTION public.auto_approve_plan_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto boolean;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  SELECT auto_approve_subscriptions INTO v_auto FROM public.platform_settings LIMIT 1;
  IF v_auto IS TRUE THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_plan_request ON public.plan_requests;
CREATE TRIGGER trg_auto_approve_plan_request
  BEFORE INSERT ON public.plan_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_plan_request();

-- Ensure the existing apply trigger is registered (it was created as a function only)
DROP TRIGGER IF EXISTS trg_apply_approved_plan_request ON public.plan_requests;
CREATE TRIGGER trg_apply_approved_plan_request
  AFTER INSERT OR UPDATE ON public.plan_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_approved_plan_request();

-- 5. Seed sensible default payment methods (only if none exist)
INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, bank_name, sort_order, is_active)
SELECT 'bank_transfer', 'Bank Transfer', 'Your Business Name', '0000-0000-0000', 'HBL', 1, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods);

INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, sort_order, is_active)
SELECT 'jazzcash', 'JazzCash', 'Your Business Name', '03XX-XXXXXXX', 2, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods WHERE type = 'jazzcash');

INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, sort_order, is_active)
SELECT 'easypaisa', 'EasyPaisa', 'Your Business Name', '03XX-XXXXXXX', 3, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods WHERE type = 'easypaisa');
