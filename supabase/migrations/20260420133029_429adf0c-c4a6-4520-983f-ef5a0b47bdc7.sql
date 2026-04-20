-- Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs (entity_type, entity_id);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read activity logs" ON public.activity_logs;
CREATE POLICY "Admins can read activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated users can insert their own logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert their own logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- Add 'standard' to enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'standard' BEFORE 'pro';

-- Platform settings columns
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS standard_plan_price numeric NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS demo_max_menu_items integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS demo_max_tables integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS basic_max_menu_items integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS basic_max_tables integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS basic_enable_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS basic_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS standard_max_menu_items integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS standard_max_tables integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS standard_enable_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS standard_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_max_menu_items integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_max_tables integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_enable_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_enable_branding boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_approve_subscriptions boolean NOT NULL DEFAULT false;
INSERT INTO public.platform_settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- plan_requests
CREATE TABLE IF NOT EXISTS public.plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  requested_plan public.subscription_plan NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method public.payment_method,
  transaction_id text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_requests_outlet ON public.plan_requests(outlet_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON public.plan_requests(status);
ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner views own plan requests" ON public.plan_requests;
CREATE POLICY "Owner views own plan requests" ON public.plan_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = plan_requests.outlet_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner creates own plan requests" ON public.plan_requests;
CREATE POLICY "Owner creates own plan requests" ON public.plan_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = plan_requests.outlet_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage plan requests" ON public.plan_requests;
CREATE POLICY "Admins manage plan requests" ON public.plan_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS plan_requests_updated_at ON public.plan_requests;
CREATE TRIGGER plan_requests_updated_at BEFORE UPDATE ON public.plan_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add paid_until on subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paid_until timestamptz;

-- apply_approved_plan_request: sets plan + paid_until
CREATE OR REPLACE FUNCTION public.apply_approved_plan_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.subscriptions
       SET plan = NEW.requested_plan,
           status = 'paid_active',
           demo_end_date = NULL,
           paid_until = now() + interval '30 days',
           updated_at = now()
     WHERE outlet_id = NEW.outlet_id;
  END IF;
  RETURN NEW;
END;
$fn$;

-- Update handle_new_outlet to use platform_settings
CREATE OR REPLACE FUNCTION public.handle_new_outlet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_days integer;
  v_enable_demo boolean;
BEGIN
  SELECT demo_duration_days, enable_demo_signup INTO v_days, v_enable_demo FROM public.platform_settings LIMIT 1;
  IF v_days IS NULL THEN v_days := 7; END IF;
  IF v_enable_demo IS NULL THEN v_enable_demo := true; END IF;
  INSERT INTO public.subscriptions (outlet_id, plan, status, demo_start_date, demo_end_date)
  VALUES (NEW.id, 'free_demo',
          CASE WHEN v_enable_demo THEN 'active'::subscription_status ELSE 'expired'::subscription_status END,
          now(), now() + make_interval(days => v_days))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.outlet_settings (outlet_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS outlets_after_insert ON public.outlets;
CREATE TRIGGER outlets_after_insert AFTER INSERT ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.handle_new_outlet();

-- admin_payment_methods
CREATE TABLE IF NOT EXISTS public.admin_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  label text NOT NULL,
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
DROP POLICY IF EXISTS "Admins manage payment methods" ON public.admin_payment_methods;
CREATE POLICY "Admins manage payment methods" ON public.admin_payment_methods FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Auth users read active methods" ON public.admin_payment_methods;
CREATE POLICY "Auth users read active methods" ON public.admin_payment_methods FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_admin_payment_methods_updated_at ON public.admin_payment_methods;
CREATE TRIGGER trg_admin_payment_methods_updated_at BEFORE UPDATE ON public.admin_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- admin-payment-qr bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-payment-qr', 'admin-payment-qr', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read QR images" ON storage.objects;
CREATE POLICY "Public read QR images" ON storage.objects FOR SELECT USING (bucket_id = 'admin-payment-qr');
DROP POLICY IF EXISTS "Admins upload QR images" ON storage.objects;
CREATE POLICY "Admins upload QR images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update QR images" ON storage.objects;
CREATE POLICY "Admins update QR images" ON storage.objects FOR UPDATE USING (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete QR images" ON storage.objects;
CREATE POLICY "Admins delete QR images" ON storage.objects FOR DELETE USING (bucket_id = 'admin-payment-qr' AND public.has_role(auth.uid(), 'admin'));

-- auto_approve_plan_request
CREATE OR REPLACE FUNCTION public.auto_approve_plan_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_auto boolean;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT auto_approve_subscriptions INTO v_auto FROM public.platform_settings LIMIT 1;
  IF v_auto IS TRUE THEN NEW.status := 'approved'; END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_auto_approve_plan_request ON public.plan_requests;
CREATE TRIGGER trg_auto_approve_plan_request BEFORE INSERT ON public.plan_requests FOR EACH ROW EXECUTE FUNCTION public.auto_approve_plan_request();
DROP TRIGGER IF EXISTS trg_apply_approved_plan_request ON public.plan_requests;
CREATE TRIGGER trg_apply_approved_plan_request AFTER UPDATE ON public.plan_requests FOR EACH ROW EXECUTE FUNCTION public.apply_approved_plan_request();

-- Seed payment methods
INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, bank_name, sort_order, is_active)
SELECT 'bank_transfer', 'Bank Transfer', 'Your Business Name', '0000-0000-0000', 'HBL', 1, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods);
INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, sort_order, is_active)
SELECT 'jazzcash', 'JazzCash', 'Your Business Name', '03XX-XXXXXXX', 2, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods WHERE type = 'jazzcash');
INSERT INTO public.admin_payment_methods (type, label, account_title, account_number, sort_order, is_active)
SELECT 'easypaisa', 'EasyPaisa', 'Your Business Name', '03XX-XXXXXXX', 3, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_payment_methods WHERE type = 'easypaisa');

-- expire lapsed subs
CREATE OR REPLACE FUNCTION public.expire_lapsed_subscriptions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_count integer;
BEGIN
  UPDATE public.subscriptions SET status = 'expired', updated_at = now()
   WHERE status = 'paid_active' AND paid_until IS NOT NULL AND paid_until < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

UPDATE public.subscriptions SET paid_until = now() + interval '30 days'
 WHERE status = 'paid_active' AND paid_until IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-lapsed-subscriptions') THEN
    PERFORM cron.unschedule('expire-lapsed-subscriptions');
  END IF;
  PERFORM cron.schedule('expire-lapsed-subscriptions', '0 * * * *', $cron$ SELECT public.expire_lapsed_subscriptions(); $cron$);
END$$;

-- Basic delivery default true
ALTER TABLE public.platform_settings ALTER COLUMN basic_enable_delivery SET DEFAULT true;
UPDATE public.platform_settings SET basic_enable_delivery = true, updated_at = now();

-- ===== Outlet access (approval + OTP) =====
DO $$ BEGIN
  CREATE TYPE public.outlet_access_status AS ENUM ('pending','approved','rejected','verified','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.outlet_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL UNIQUE REFERENCES public.outlets(id) ON DELETE CASCADE,
  status public.outlet_access_status NOT NULL DEFAULT 'pending',
  otp_code_hash text,
  otp_plain_for_admin text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  otp_max_attempts integer NOT NULL DEFAULT 5,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  verified_at timestamptz,
  blocked_at timestamptz,
  last_password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outlet_access_status ON public.outlet_access(status);
DROP TRIGGER IF EXISTS trg_outlet_access_updated_at ON public.outlet_access;
CREATE TRIGGER trg_outlet_access_updated_at BEFORE UPDATE ON public.outlet_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.outlet_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner reads own outlet_access" ON public.outlet_access;
CREATE POLICY "Owner reads own outlet_access" ON public.outlet_access FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = outlet_access.outlet_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admin full access outlet_access" ON public.outlet_access;
CREATE POLICY "Admin full access outlet_access" ON public.outlet_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_outlet_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.outlet_access (outlet_id, status) VALUES (NEW.id, 'pending')
  ON CONFLICT (outlet_id) DO NOTHING;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_handle_new_outlet_access ON public.outlets;
CREATE TRIGGER trg_handle_new_outlet_access AFTER INSERT ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.handle_new_outlet_access();

INSERT INTO public.outlet_access (outlet_id, status, verified_at, approved_at)
SELECT o.id, 'verified', now(), now() FROM public.outlets o
WHERE NOT EXISTS (SELECT 1 FROM public.outlet_access a WHERE a.outlet_id = o.id);

CREATE OR REPLACE FUNCTION public._gen_otp_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE v int;
BEGIN
  v := floor(random() * 900000)::int + 100000;
  RETURN v::text;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_approve_outlet(_outlet_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_code text; v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_code := public._gen_otp_code();
  v_hash := encode(digest(v_code, 'sha256'), 'hex');
  INSERT INTO public.outlet_access (outlet_id, status, otp_code_hash, otp_plain_for_admin, otp_expires_at, otp_attempts, approved_by, approved_at)
  VALUES (_outlet_id, 'approved', v_hash, v_code, now() + interval '24 hours', 0, auth.uid(), now())
  ON CONFLICT (outlet_id) DO UPDATE
    SET status = 'approved', otp_code_hash = EXCLUDED.otp_code_hash, otp_plain_for_admin = EXCLUDED.otp_plain_for_admin,
        otp_expires_at = EXCLUDED.otp_expires_at, otp_attempts = 0, approved_by = auth.uid(), approved_at = now(),
        rejected_reason = NULL, blocked_at = NULL, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_reject_outlet(_outlet_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.outlet_access (outlet_id, status, rejected_reason)
  VALUES (_outlet_id, 'rejected', _reason)
  ON CONFLICT (outlet_id) DO UPDATE
    SET status = 'rejected', rejected_reason = _reason, otp_code_hash = NULL,
        otp_plain_for_admin = NULL, otp_expires_at = NULL, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_outlet_otp(_outlet_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_code text; v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_code := public._gen_otp_code();
  v_hash := encode(digest(v_code, 'sha256'), 'hex');
  UPDATE public.outlet_access
     SET status = 'approved', otp_code_hash = v_hash, otp_plain_for_admin = v_code,
         otp_expires_at = now() + interval '24 hours', otp_attempts = 0, blocked_at = NULL,
         approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE outlet_id = _outlet_id;
  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.verify_outlet_otp(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_outlet_id uuid; v_row public.outlet_access%ROWTYPE; v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_outlet_id FROM public.outlets WHERE owner_id = auth.uid() LIMIT 1;
  IF v_outlet_id IS NULL THEN RAISE EXCEPTION 'No outlet for current user'; END IF;
  SELECT * INTO v_row FROM public.outlet_access WHERE outlet_id = v_outlet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access record not found'; END IF;
  IF v_row.status = 'verified' THEN RETURN jsonb_build_object('ok', true, 'already_verified', true); END IF;
  IF v_row.status = 'blocked' THEN RETURN jsonb_build_object('ok', false, 'error', 'blocked', 'message', 'Account locked. Contact admin to unblock.'); END IF;
  IF v_row.status = 'rejected' THEN RETURN jsonb_build_object('ok', false, 'error', 'rejected', 'message', 'Your application was rejected.'); END IF;
  IF v_row.status = 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'pending', 'message', 'Awaiting admin approval.'); END IF;
  IF v_row.otp_expires_at IS NULL OR v_row.otp_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired', 'message', 'OTP expired. Ask admin to regenerate.');
  END IF;
  v_hash := encode(digest(_code, 'sha256'), 'hex');
  IF v_row.otp_code_hash = v_hash THEN
    UPDATE public.outlet_access
       SET status = 'verified', verified_at = now(), otp_code_hash = NULL,
           otp_plain_for_admin = NULL, otp_expires_at = NULL, otp_attempts = 0, updated_at = now()
     WHERE outlet_id = v_outlet_id;
    RETURN jsonb_build_object('ok', true);
  ELSE
    UPDATE public.outlet_access
       SET otp_attempts = otp_attempts + 1,
           status = CASE WHEN otp_attempts + 1 >= otp_max_attempts THEN 'blocked'::public.outlet_access_status ELSE status END,
           blocked_at = CASE WHEN otp_attempts + 1 >= otp_max_attempts THEN now() ELSE blocked_at END,
           updated_at = now()
     WHERE outlet_id = v_outlet_id
     RETURNING * INTO v_row;
    IF v_row.status = 'blocked' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'blocked', 'message', 'Too many wrong attempts. Account locked.');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid',
      'attempts_left', GREATEST(v_row.otp_max_attempts - v_row.otp_attempts, 0),
      'message', 'Incorrect code.');
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.stamp_password_changed()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_outlet_id uuid;
BEGIN
  SELECT id INTO v_outlet_id FROM public.outlets WHERE owner_id = auth.uid() LIMIT 1;
  IF v_outlet_id IS NULL THEN RETURN; END IF;
  UPDATE public.outlet_access SET last_password_changed_at = now(), updated_at = now()
   WHERE outlet_id = v_outlet_id;
END;
$fn$;