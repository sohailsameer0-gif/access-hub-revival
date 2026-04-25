
-- 1) Add 'cancelled' to order_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'public.order_status'::regtype) THEN
    ALTER TYPE public.order_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- 2) Cancellation columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_reason_text text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text;

-- 3) Staff table
CREATE TABLE IF NOT EXISTS public.outlet_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('rider','waiter')),
  name text NOT NULL,
  phone text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outlet_staff_outlet ON public.outlet_staff(outlet_id);

ALTER TABLE public.outlet_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages staff" ON public.outlet_staff;
CREATE POLICY "Owner manages staff" ON public.outlet_staff
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = outlet_staff.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = outlet_staff.outlet_id AND outlets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins read staff" ON public.outlet_staff;
CREATE POLICY "Admins read staff" ON public.outlet_staff
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_outlet_staff_updated_at ON public.outlet_staff;
CREATE TRIGGER update_outlet_staff_updated_at
  BEFORE UPDATE ON public.outlet_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Assign staff to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES public.outlet_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES public.outlet_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_rider ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON public.orders(waiter_id);

-- 5) outlet_activity_resets
CREATE TABLE IF NOT EXISTS public.outlet_activity_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL,
  cleared_types text[] NOT NULL DEFAULT '{}',
  reason text NOT NULL,
  reset_by uuid,
  reset_by_email text,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outlet_activity_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage activity resets" ON public.outlet_activity_resets;
CREATE POLICY "Admins manage activity resets"
  ON public.outlet_activity_resets
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner reads own activity resets" ON public.outlet_activity_resets;
CREATE POLICY "Owner reads own activity resets"
  ON public.outlet_activity_resets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.outlets
    WHERE outlets.id = outlet_activity_resets.outlet_id
      AND outlets.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_outlet_activity_resets_outlet ON public.outlet_activity_resets(outlet_id, created_at DESC);

-- 6) outlet_messages
CREATE TABLE IF NOT EXISTS public.outlet_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'admin_message',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outlet_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage outlet messages" ON public.outlet_messages;
CREATE POLICY "Admins manage outlet messages"
  ON public.outlet_messages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner reads own outlet messages" ON public.outlet_messages;
CREATE POLICY "Owner reads own outlet messages"
  ON public.outlet_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.outlets
    WHERE outlets.id = outlet_messages.outlet_id
      AND outlets.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owner updates own outlet messages" ON public.outlet_messages;
CREATE POLICY "Owner updates own outlet messages"
  ON public.outlet_messages
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.outlets
    WHERE outlets.id = outlet_messages.outlet_id
      AND outlets.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_outlet_messages_outlet ON public.outlet_messages(outlet_id, created_at DESC);
