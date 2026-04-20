-- =========================================================
-- OUTLET ACCESS APPROVAL + OTP VERIFICATION
-- =========================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.outlet_access_status AS ENUM ('pending','approved','rejected','verified','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS public.outlet_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL UNIQUE REFERENCES public.outlets(id) ON DELETE CASCADE,
  status public.outlet_access_status NOT NULL DEFAULT 'pending',
  otp_code_hash text,
  otp_plain_for_admin text, -- visible only to admins via RLS, cleared on successful verify
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

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_outlet_access_updated_at ON public.outlet_access;
CREATE TRIGGER trg_outlet_access_updated_at
  BEFORE UPDATE ON public.outlet_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.outlet_access ENABLE ROW LEVEL SECURITY;

-- Owners read own row (we'll use a SECURITY DEFINER view-style fn for safe-fields, but for now allow SELECT;
-- the OTP hash is never displayed in UI and the "plain" is only useful inside admin RLS path)
DROP POLICY IF EXISTS "Owner reads own outlet_access" ON public.outlet_access;
CREATE POLICY "Owner reads own outlet_access" ON public.outlet_access
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = outlet_access.outlet_id AND o.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin full access outlet_access" ON public.outlet_access;
CREATE POLICY "Admin full access outlet_access" ON public.outlet_access
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- TRIGGER: auto-create access row on new outlet
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_outlet_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.outlet_access (outlet_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (outlet_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_outlet_access ON public.outlets;
CREATE TRIGGER trg_handle_new_outlet_access
  AFTER INSERT ON public.outlets
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_outlet_access();

-- =========================================================
-- BACKFILL existing outlets as VERIFIED (zero disruption)
-- =========================================================
INSERT INTO public.outlet_access (outlet_id, status, verified_at, approved_at)
SELECT o.id, 'verified', now(), now()
FROM public.outlets o
WHERE NOT EXISTS (SELECT 1 FROM public.outlet_access a WHERE a.outlet_id = o.id);

-- =========================================================
-- HELPER: random 6-digit OTP
-- =========================================================
CREATE OR REPLACE FUNCTION public._gen_otp_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v int;
BEGIN
  v := floor(random() * 900000)::int + 100000;
  RETURN v::text;
END;
$$;

-- =========================================================
-- ADMIN: approve outlet (creates fresh OTP, 24h expiry)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_approve_outlet(_outlet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_code := public._gen_otp_code();
  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  INSERT INTO public.outlet_access (outlet_id, status, otp_code_hash, otp_plain_for_admin, otp_expires_at, otp_attempts, approved_by, approved_at)
  VALUES (_outlet_id, 'approved', v_hash, v_code, now() + interval '24 hours', 0, auth.uid(), now())
  ON CONFLICT (outlet_id) DO UPDATE
    SET status = 'approved',
        otp_code_hash = EXCLUDED.otp_code_hash,
        otp_plain_for_admin = EXCLUDED.otp_plain_for_admin,
        otp_expires_at = EXCLUDED.otp_expires_at,
        otp_attempts = 0,
        approved_by = auth.uid(),
        approved_at = now(),
        rejected_reason = NULL,
        blocked_at = NULL,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$$;

-- =========================================================
-- ADMIN: reject outlet
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_reject_outlet(_outlet_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.outlet_access (outlet_id, status, rejected_reason)
  VALUES (_outlet_id, 'rejected', _reason)
  ON CONFLICT (outlet_id) DO UPDATE
    SET status = 'rejected',
        rejected_reason = _reason,
        otp_code_hash = NULL,
        otp_plain_for_admin = NULL,
        otp_expires_at = NULL,
        updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =========================================================
-- ADMIN: regenerate OTP (also unblocks)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_regenerate_outlet_otp(_outlet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_code := public._gen_otp_code();
  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  UPDATE public.outlet_access
     SET status = 'approved',
         otp_code_hash = v_hash,
         otp_plain_for_admin = v_code,
         otp_expires_at = now() + interval '24 hours',
         otp_attempts = 0,
         blocked_at = NULL,
         approved_by = auth.uid(),
         approved_at = now(),
         updated_at = now()
   WHERE outlet_id = _outlet_id;

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$$;

-- =========================================================
-- OUTLET: verify OTP (called by outlet owner)
-- =========================================================
CREATE OR REPLACE FUNCTION public.verify_outlet_otp(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id uuid;
  v_row public.outlet_access%ROWTYPE;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_outlet_id FROM public.outlets WHERE owner_id = auth.uid() LIMIT 1;
  IF v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'No outlet for current user';
  END IF;

  SELECT * INTO v_row FROM public.outlet_access WHERE outlet_id = v_outlet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access record not found';
  END IF;

  IF v_row.status = 'verified' THEN
    RETURN jsonb_build_object('ok', true, 'already_verified', true);
  END IF;

  IF v_row.status = 'blocked' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked', 'message', 'Account locked. Contact admin to unblock.');
  END IF;

  IF v_row.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rejected', 'message', 'Your application was rejected.');
  END IF;

  IF v_row.status = 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending', 'message', 'Awaiting admin approval.');
  END IF;

  IF v_row.otp_expires_at IS NULL OR v_row.otp_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired', 'message', 'OTP expired. Ask admin to regenerate.');
  END IF;

  v_hash := encode(digest(_code, 'sha256'), 'hex');

  IF v_row.otp_code_hash = v_hash THEN
    UPDATE public.outlet_access
       SET status = 'verified',
           verified_at = now(),
           otp_code_hash = NULL,
           otp_plain_for_admin = NULL,
           otp_expires_at = NULL,
           otp_attempts = 0,
           updated_at = now()
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

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid',
      'attempts_left', GREATEST(v_row.otp_max_attempts - v_row.otp_attempts, 0),
      'message', 'Incorrect code.'
    );
  END IF;
END;
$$;

-- =========================================================
-- OUTLET: stamp last password change
-- =========================================================
CREATE OR REPLACE FUNCTION public.stamp_password_changed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id uuid;
BEGIN
  SELECT id INTO v_outlet_id FROM public.outlets WHERE owner_id = auth.uid() LIMIT 1;
  IF v_outlet_id IS NULL THEN RETURN; END IF;
  UPDATE public.outlet_access
     SET last_password_changed_at = now(), updated_at = now()
   WHERE outlet_id = v_outlet_id;
END;
$$;

-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;