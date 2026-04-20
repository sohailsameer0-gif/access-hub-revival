-- ============================================================
-- Outlet Suspension Enforcement (DB Layer)
-- ============================================================

-- 1) Helper: is the current user an active (non-suspended, approved) outlet owner?
CREATE OR REPLACE FUNCTION public.is_outlet_active(_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outlets
    WHERE id = _outlet_id
      AND suspended = false
      AND approval_status = 'approved'
      AND is_active = true
  );
$$;

-- 2) Helper: does the current user own this outlet AND is the outlet active?
CREATE OR REPLACE FUNCTION public.owns_active_outlet(_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outlets
    WHERE id = _outlet_id
      AND owner_id = auth.uid()
      AND suspended = false
      AND approval_status = 'approved'
      AND is_active = true
  );
$$;

-- 3) Tighten owner-side RLS on outlets: suspended owners can READ their own row
--    (so the UI can show the suspended screen) but cannot UPDATE/INSERT/DELETE it.
DROP POLICY IF EXISTS "Owners manage own outlet" ON public.outlets;

CREATE POLICY "Owners read own outlet"
  ON public.outlets FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert own outlet"
  ON public.outlets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Active owners update own outlet"
  ON public.outlets FOR UPDATE
  USING (auth.uid() = owner_id AND suspended = false)
  WITH CHECK (auth.uid() = owner_id AND suspended = false);

CREATE POLICY "Owners delete own outlet"
  ON public.outlets FOR DELETE
  USING (auth.uid() = owner_id AND suspended = false);

-- 4) Tighten mutation policies on outlet-owned tables to require active outlet.
--    Reads stay open (already public). Only writes are gated by suspension.

-- menu_categories
DROP POLICY IF EXISTS "Owner manages categories" ON public.menu_categories;
CREATE POLICY "Active owner manages categories"
  ON public.menu_categories FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- menu_items
DROP POLICY IF EXISTS "Owner manages items" ON public.menu_items;
CREATE POLICY "Active owner manages items"
  ON public.menu_items FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- tables
DROP POLICY IF EXISTS "Owner manages tables" ON public.tables;
CREATE POLICY "Active owner manages tables"
  ON public.tables FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- outlet_settings
DROP POLICY IF EXISTS "Owner manages settings" ON public.outlet_settings;
CREATE POLICY "Active owner manages settings"
  ON public.outlet_settings FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- orders (owner side — public can still create via separate policy)
DROP POLICY IF EXISTS "Owner manages orders" ON public.orders;
CREATE POLICY "Active owner manages orders"
  ON public.orders FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- payments (owner side)
DROP POLICY IF EXISTS "Owner manages payments" ON public.payments;
CREATE POLICY "Active owner manages payments"
  ON public.payments FOR ALL
  USING (public.owns_active_outlet(outlet_id))
  WITH CHECK (public.owns_active_outlet(outlet_id));

-- plan_requests: a suspended outlet should still be able to submit a new
-- plan request (so they can pay to be reactivated), but only owner_id check
-- is needed — keep the existing policy. No change.

-- 5) Auto-sync: when admin sets outlets.suspended, mirror to subscriptions.status.
CREATE OR REPLACE FUNCTION public.sync_subscription_on_outlet_suspend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.suspended IS DISTINCT FROM OLD.suspended THEN
    IF NEW.suspended = true THEN
      UPDATE public.subscriptions
        SET status = 'suspended', updated_at = now()
        WHERE outlet_id = NEW.id;
    ELSE
      -- Reactivation: restore to a sensible status based on plan/dates
      UPDATE public.subscriptions
        SET status = CASE
              WHEN plan = 'free_demo' AND demo_end_date IS NOT NULL AND demo_end_date > now() THEN 'active'::subscription_status
              WHEN plan <> 'free_demo' AND paid_until IS NOT NULL AND paid_until > now() THEN 'paid_active'::subscription_status
              ELSE 'expired'::subscription_status
            END,
            updated_at = now()
        WHERE outlet_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sub_on_outlet_suspend ON public.outlets;
CREATE TRIGGER trg_sync_sub_on_outlet_suspend
  AFTER UPDATE OF suspended ON public.outlets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subscription_on_outlet_suspend();