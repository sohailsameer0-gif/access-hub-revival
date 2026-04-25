
-- admin_reset_outlet_activity
CREATE OR REPLACE FUNCTION public.admin_reset_outlet_activity(
  _outlet_id uuid,
  _types text[],
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_counts jsonb := '{}'::jsonb;
  v_n int;
  v_outlet_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Forbidden');
  END IF;

  IF _outlet_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Outlet required');
  END IF;

  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Reason required (min 3 chars)');
  END IF;

  IF _types IS NULL OR array_length(_types, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Select at least one data type');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  SELECT name INTO v_outlet_name FROM public.outlets WHERE id = _outlet_id;

  IF 'orders' = ANY(_types) THEN
    DELETE FROM public.bill_requests WHERE order_id IN (SELECT id FROM public.orders WHERE outlet_id = _outlet_id);
    DELETE FROM public.payment_proofs WHERE payment_id IN (SELECT id FROM public.payments WHERE outlet_id = _outlet_id);
    DELETE FROM public.payments WHERE outlet_id = _outlet_id;
    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE outlet_id = _outlet_id);
    DELETE FROM public.orders WHERE outlet_id = _outlet_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('orders', v_n);
  END IF;

  IF 'payments' = ANY(_types) AND NOT ('orders' = ANY(_types)) THEN
    DELETE FROM public.payment_proofs WHERE payment_id IN (SELECT id FROM public.payments WHERE outlet_id = _outlet_id);
    DELETE FROM public.payments WHERE outlet_id = _outlet_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('payments', v_n);
  END IF;

  IF 'plan_requests' = ANY(_types) THEN
    DELETE FROM public.plan_requests WHERE outlet_id = _outlet_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('plan_requests', v_n);
  END IF;

  IF 'activity_logs' = ANY(_types) THEN
    DELETE FROM public.activity_logs
    WHERE entity_id = _outlet_id
       OR entity_id IN (SELECT id FROM public.subscriptions WHERE outlet_id = _outlet_id);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('activity_logs', v_n);
  END IF;

  IF 'messages' = ANY(_types) THEN
    DELETE FROM public.outlet_messages WHERE outlet_id = _outlet_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('messages', v_n);
  END IF;

  IF 'resets' = ANY(_types) THEN
    DELETE FROM public.outlet_activity_resets WHERE outlet_id = _outlet_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('resets', v_n);
  END IF;

  INSERT INTO public.outlet_activity_resets (outlet_id, cleared_types, reason, reset_by, reset_by_email, counts)
  VALUES (_outlet_id, _types, _reason, v_actor, v_email, v_counts);

  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (v_actor, v_email, 'outlet.activity_reset', 'outlet', _outlet_id, v_outlet_name,
          jsonb_build_object('types', _types, 'reason', _reason, 'counts', v_counts));

  RETURN jsonb_build_object('ok', true, 'counts', v_counts);
END;
$$;

-- admin_approve_plan_request
CREATE OR REPLACE FUNCTION public.admin_approve_plan_request(_request_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_req plan_requests%ROWTYPE;
  v_outlet_name text;
  v_new_paid_until timestamptz;
  v_existing_paid_until timestamptz;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Forbidden');
  END IF;

  SELECT * INTO v_req FROM public.plan_requests WHERE id = _request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Request not found');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  SELECT name INTO v_outlet_name FROM public.outlets WHERE id = v_req.outlet_id;

  SELECT paid_until INTO v_existing_paid_until
  FROM public.subscriptions WHERE outlet_id = v_req.outlet_id;

  IF v_existing_paid_until IS NOT NULL AND v_existing_paid_until > now() THEN
    v_new_paid_until := v_existing_paid_until + interval '30 days';
  ELSE
    v_new_paid_until := now() + interval '30 days';
  END IF;

  UPDATE public.plan_requests
     SET status = 'approved',
         admin_note = COALESCE(_admin_note, admin_note),
         updated_at = now()
   WHERE id = _request_id;

  INSERT INTO public.subscriptions (outlet_id, plan, status, paid_until)
  VALUES (v_req.outlet_id, v_req.requested_plan::subscription_plan, 'paid_active', v_new_paid_until)
  ON CONFLICT (outlet_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'paid_active',
        paid_until = EXCLUDED.paid_until,
        updated_at = now();

  INSERT INTO public.outlet_messages (outlet_id, kind, title, body, metadata, created_by)
  VALUES (
    v_req.outlet_id,
    'subscription_approved',
    'Subscription approved',
    'Your ' || v_req.requested_plan || ' plan has been activated. Renews ' || to_char(v_new_paid_until, 'DD Mon YYYY') || '.',
    jsonb_build_object('plan', v_req.requested_plan, 'paid_until', v_new_paid_until, 'request_id', _request_id),
    v_actor
  );

  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (
    v_actor, v_email, 'subscription.approved', 'subscription', v_req.outlet_id, v_outlet_name,
    jsonb_build_object('request_id', _request_id, 'plan', v_req.requested_plan, 'paid_until', v_new_paid_until, 'amount', v_req.amount)
  );

  RETURN jsonb_build_object('ok', true, 'plan', v_req.requested_plan, 'paid_until', v_new_paid_until);
END;
$$;

-- admin_reject_plan_request
CREATE OR REPLACE FUNCTION public.admin_reject_plan_request(_request_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_req plan_requests%ROWTYPE;
  v_outlet_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Forbidden');
  END IF;

  SELECT * INTO v_req FROM public.plan_requests WHERE id = _request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Request not found');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  SELECT name INTO v_outlet_name FROM public.outlets WHERE id = v_req.outlet_id;

  UPDATE public.plan_requests
     SET status = 'rejected',
         admin_note = COALESCE(_admin_note, admin_note),
         updated_at = now()
   WHERE id = _request_id;

  INSERT INTO public.outlet_messages (outlet_id, kind, title, body, metadata, created_by)
  VALUES (
    v_req.outlet_id,
    'subscription_rejected',
    'Subscription request rejected',
    COALESCE('Reason: ' || _admin_note, 'Your subscription request was rejected. Please contact support.'),
    jsonb_build_object('plan', v_req.requested_plan, 'request_id', _request_id, 'admin_note', _admin_note),
    v_actor
  );

  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (
    v_actor, v_email, 'subscription.rejected', 'subscription', v_req.outlet_id, v_outlet_name,
    jsonb_build_object('request_id', _request_id, 'plan', v_req.requested_plan, 'admin_note', _admin_note)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;
