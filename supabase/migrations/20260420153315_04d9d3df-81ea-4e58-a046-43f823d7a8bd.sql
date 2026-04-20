CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the OTP-related functions with explicit search_path that includes extensions
CREATE OR REPLACE FUNCTION public.admin_approve_outlet(_outlet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_code text; v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_code := public._gen_otp_code();
  v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');
  INSERT INTO public.outlet_access (outlet_id, status, otp_code_hash, otp_plain_for_admin, otp_expires_at, otp_attempts, approved_by, approved_at)
  VALUES (_outlet_id, 'approved', v_hash, v_code, now() + interval '24 hours', 0, auth.uid(), now())
  ON CONFLICT (outlet_id) DO UPDATE
    SET status = 'approved', otp_code_hash = EXCLUDED.otp_code_hash, otp_plain_for_admin = EXCLUDED.otp_plain_for_admin,
        otp_expires_at = EXCLUDED.otp_expires_at, otp_attempts = 0, approved_by = auth.uid(), approved_at = now(),
        rejected_reason = NULL, blocked_at = NULL, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_outlet_otp(_outlet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_code text; v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_code := public._gen_otp_code();
  v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');
  UPDATE public.outlet_access
     SET status = 'approved', otp_code_hash = v_hash, otp_plain_for_admin = v_code,
         otp_expires_at = now() + interval '24 hours', otp_attempts = 0, blocked_at = NULL,
         approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE outlet_id = _outlet_id;
  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', (now() + interval '24 hours'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_outlet_otp(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  v_hash := encode(extensions.digest(_code, 'sha256'), 'hex');
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
$function$;