
-- 1. Add paid_until column to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paid_until timestamp with time zone;

-- 2. Update the apply_approved_plan_request trigger to set paid_until = now() + 30 days
CREATE OR REPLACE FUNCTION public.apply_approved_plan_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Ensure trigger exists on plan_requests (idempotent)
DROP TRIGGER IF EXISTS trg_apply_approved_plan_request ON public.plan_requests;
CREATE TRIGGER trg_apply_approved_plan_request
  AFTER UPDATE ON public.plan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_approved_plan_request();

DROP TRIGGER IF EXISTS trg_auto_approve_plan_request ON public.plan_requests;
CREATE TRIGGER trg_auto_approve_plan_request
  BEFORE INSERT ON public.plan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_plan_request();

-- 3. Function to expire lapsed paid subscriptions
CREATE OR REPLACE FUNCTION public.expire_lapsed_subscriptions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
     SET status = 'expired',
         updated_at = now()
   WHERE status = 'paid_active'
     AND paid_until IS NOT NULL
     AND paid_until < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 4. Backfill paid_until for any existing paid_active subs missing it (give them 30d from now)
UPDATE public.subscriptions
   SET paid_until = now() + interval '30 days'
 WHERE status = 'paid_active'
   AND paid_until IS NULL;

-- 5. Schedule the expiry job to run every hour via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-lapsed-subscriptions') THEN
    PERFORM cron.unschedule('expire-lapsed-subscriptions');
  END IF;
  PERFORM cron.schedule(
    'expire-lapsed-subscriptions',
    '0 * * * *',
    $cron$ SELECT public.expire_lapsed_subscriptions(); $cron$
  );
END$$;
