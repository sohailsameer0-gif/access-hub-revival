
-- 1. Add 'standard' to subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'standard' BEFORE 'pro';

-- 2. Add plan-config columns to platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS standard_plan_price numeric NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS demo_max_menu_items integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS demo_max_tables integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS basic_max_menu_items integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS basic_max_tables integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS basic_enable_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS basic_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS standard_max_menu_items integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS standard_max_tables integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS standard_enable_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS standard_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_max_menu_items integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_max_tables integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_enable_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_enable_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS premium_enable_branding boolean NOT NULL DEFAULT true;

-- Make sure exactly one row exists
INSERT INTO public.platform_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 3. plan_requests table
CREATE TABLE IF NOT EXISTS public.plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  requested_plan public.subscription_plan NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method public.payment_method,
  transaction_id text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_requests_outlet ON public.plan_requests(outlet_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON public.plan_requests(status);

ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner views own plan requests" ON public.plan_requests;
CREATE POLICY "Owner views own plan requests" ON public.plan_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = plan_requests.outlet_id AND o.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner creates own plan requests" ON public.plan_requests;
CREATE POLICY "Owner creates own plan requests" ON public.plan_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = plan_requests.outlet_id AND o.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage plan requests" ON public.plan_requests;
CREATE POLICY "Admins manage plan requests" ON public.plan_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS plan_requests_updated_at ON public.plan_requests;
CREATE TRIGGER plan_requests_updated_at
  BEFORE UPDATE ON public.plan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger: when a request is approved, activate the subscription
CREATE OR REPLACE FUNCTION public.apply_approved_plan_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.subscriptions
       SET plan = NEW.requested_plan,
           status = 'paid_active',
           demo_end_date = NULL,
           updated_at = now()
     WHERE outlet_id = NEW.outlet_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plan_requests_apply_approved ON public.plan_requests;
CREATE TRIGGER plan_requests_apply_approved
  AFTER UPDATE ON public.plan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_approved_plan_request();

-- 5. Update handle_new_outlet to use platform_settings demo_duration_days
CREATE OR REPLACE FUNCTION public.handle_new_outlet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_enable_demo boolean;
BEGIN
  SELECT demo_duration_days, enable_demo_signup INTO v_days, v_enable_demo
    FROM public.platform_settings LIMIT 1;
  IF v_days IS NULL THEN v_days := 7; END IF;
  IF v_enable_demo IS NULL THEN v_enable_demo := true; END IF;

  INSERT INTO public.subscriptions (outlet_id, plan, status, demo_start_date, demo_end_date)
  VALUES (
    NEW.id,
    'free_demo',
    CASE WHEN v_enable_demo THEN 'active'::subscription_status ELSE 'expired'::subscription_status END,
    now(),
    now() + make_interval(days => v_days)
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.outlet_settings (outlet_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Make sure trigger exists on outlets (it referenced this function before)
DROP TRIGGER IF EXISTS outlets_after_insert ON public.outlets;
CREATE TRIGGER outlets_after_insert
  AFTER INSERT ON public.outlets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_outlet();
