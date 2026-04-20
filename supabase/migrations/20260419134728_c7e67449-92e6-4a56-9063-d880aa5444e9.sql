-- ===== Enums =====
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'outlet_owner'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.business_type AS ENUM ('restaurant', 'hotel', 'fast_food', 'cafe', 'bakery', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.order_type AS ENUM ('dine_in', 'takeaway', 'delivery'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','served','closed','ready_for_pickup','picked_up','out_for_delivery','delivered'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','jazzcash','easypaisa'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('unpaid','pending_verification','paid','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_plan AS ENUM ('free_demo','basic','pro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('active','expired','paid_active','suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.outlet_approval_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== updated_at helper =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== user_roles =====
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== outlets =====
CREATE TABLE IF NOT EXISTS public.outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  google_maps_link TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  business_type public.business_type NOT NULL DEFAULT 'restaurant',
  is_active BOOLEAN NOT NULL DEFAULT true,
  approval_status public.outlet_approval_status NOT NULL DEFAULT 'approved',
  suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage own outlet" ON public.outlets;
CREATE POLICY "Owners manage own outlet" ON public.outlets FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Public can view active outlets" ON public.outlets;
CREATE POLICY "Public can view active outlets" ON public.outlets FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can view all outlets" ON public.outlets;
CREATE POLICY "Admins can view all outlets" ON public.outlets FOR SELECT USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can update all outlets" ON public.outlets;
CREATE POLICY "Admins can update all outlets" ON public.outlets FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_outlets_updated_at ON public.outlets;
CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== outlet_settings =====
CREATE TABLE IF NOT EXISTS public.outlet_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE UNIQUE,
  tax_rate NUMERIC DEFAULT 0,
  service_charge_rate NUMERIC DEFAULT 0,
  delivery_charge NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'PKR',
  enable_dine_in BOOLEAN DEFAULT true,
  enable_takeaway BOOLEAN DEFAULT true,
  enable_delivery BOOLEAN DEFAULT false,
  bank_name TEXT DEFAULT '',
  bank_account_title TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_iban TEXT DEFAULT '',
  jazzcash_number TEXT DEFAULT '',
  jazzcash_title TEXT DEFAULT '',
  easypaisa_number TEXT DEFAULT '',
  easypaisa_title TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outlet_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages settings" ON public.outlet_settings;
CREATE POLICY "Owner manages settings" ON public.outlet_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = outlet_settings.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = outlet_settings.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can view settings" ON public.outlet_settings;
CREATE POLICY "Public can view settings" ON public.outlet_settings FOR SELECT USING (true);
DROP TRIGGER IF EXISTS update_outlet_settings_updated_at ON public.outlet_settings;
CREATE TRIGGER update_outlet_settings_updated_at BEFORE UPDATE ON public.outlet_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== subscriptions =====
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE UNIQUE,
  plan public.subscription_plan NOT NULL DEFAULT 'free_demo',
  status public.subscription_status NOT NULL DEFAULT 'active',
  demo_start_date TIMESTAMPTZ DEFAULT now(),
  demo_end_date TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can view own sub" ON public.subscriptions;
CREATE POLICY "Owner can view own sub" ON public.subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = subscriptions.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage subs" ON public.subscriptions;
CREATE POLICY "Admins manage subs" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== menu_categories =====
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages categories" ON public.menu_categories;
CREATE POLICY "Owner manages categories" ON public.menu_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = menu_categories.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = menu_categories.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can view categories" ON public.menu_categories;
CREATE POLICY "Public can view categories" ON public.menu_categories FOR SELECT USING (true);

-- ===== menu_items =====
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL,
  discounted_price NUMERIC,
  image_url TEXT DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages items" ON public.menu_items;
CREATE POLICY "Owner manages items" ON public.menu_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = menu_items.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = menu_items.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can view available items" ON public.menu_items;
CREATE POLICY "Public can view available items" ON public.menu_items FOR SELECT USING (true);
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== tables =====
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  name TEXT DEFAULT '',
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages tables" ON public.tables;
CREATE POLICY "Owner manages tables" ON public.tables FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = tables.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = tables.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can view tables" ON public.tables;
CREATE POLICY "Public can view tables" ON public.tables FOR SELECT USING (true);

-- ===== orders =====
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.tables(id),
  order_type public.order_type NOT NULL DEFAULT 'dine_in',
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method public.payment_method,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  location_link TEXT DEFAULT '',
  vehicle_number TEXT DEFAULT '',
  pickup_time TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  service_charge NUMERIC DEFAULT 0,
  delivery_charge NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  special_instructions TEXT DEFAULT '',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages orders" ON public.orders;
CREATE POLICY "Owner manages orders" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = orders.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = orders.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== order_items =====
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  special_instructions TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order items follow order access" ON public.order_items;
CREATE POLICY "Order items follow order access" ON public.order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
CREATE POLICY "Public can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- ===== bill_requests =====
CREATE TABLE IF NOT EXISTS public.bill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bill requests follow order access" ON public.bill_requests;
CREATE POLICY "Bill requests follow order access" ON public.bill_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can create bill requests" ON public.bill_requests;
CREATE POLICY "Public can create bill requests" ON public.bill_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Owner manages bill requests" ON public.bill_requests;
CREATE POLICY "Owner manages bill requests" ON public.bill_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.orders JOIN public.outlets ON outlets.id = orders.outlet_id WHERE orders.id = bill_requests.order_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders JOIN public.outlets ON outlets.id = orders.outlet_id WHERE orders.id = bill_requests.order_id AND outlets.owner_id = auth.uid()));

-- ===== payments =====
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method public.payment_method,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  cash_handling_mode TEXT,
  amount_received NUMERIC,
  change_returned NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages payments" ON public.payments;
CREATE POLICY "Owner manages payments" ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = payments.outlet_id AND outlets.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.outlets WHERE outlets.id = payments.outlet_id AND outlets.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
CREATE POLICY "Public can view payments" ON public.payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== payment_proofs =====
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payment proofs follow payment access" ON public.payment_proofs;
CREATE POLICY "Payment proofs follow payment access" ON public.payment_proofs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can upload proofs" ON public.payment_proofs;
CREATE POLICY "Public can upload proofs" ON public.payment_proofs FOR INSERT WITH CHECK (true);

-- ===== platform_settings (admin-only) =====
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_duration_days integer NOT NULL DEFAULT 7,
  basic_plan_price numeric NOT NULL DEFAULT 1500,
  pro_plan_price numeric NOT NULL DEFAULT 3500,
  enable_demo_signup boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Public can read platform settings" ON public.platform_settings;
CREATE POLICY "Public can read platform settings" ON public.platform_settings FOR SELECT USING (true);
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.platform_settings (demo_duration_days, basic_plan_price, pro_plan_price, enable_demo_signup)
SELECT 7, 1500, 3500, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- ===== Triggers: auto-create sub + settings on outlet, assign role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_outlet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (outlet_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.outlet_settings (outlet_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_outlet_created ON public.outlets;
CREATE TRIGGER on_outlet_created AFTER INSERT ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.handle_new_outlet();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'outlet_owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Storage buckets =====
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images','menu-images',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('outlet-images','outlet-images',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs','payment-proofs',false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view menu images" ON storage.objects;
CREATE POLICY "Public can view menu images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
DROP POLICY IF EXISTS "Auth users upload menu images" ON storage.objects;
CREATE POLICY "Auth users upload menu images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update menu images" ON storage.objects;
CREATE POLICY "Auth users update menu images" ON storage.objects FOR UPDATE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete menu images" ON storage.objects;
CREATE POLICY "Auth users delete menu images" ON storage.objects FOR DELETE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view outlet images" ON storage.objects;
CREATE POLICY "Public can view outlet images" ON storage.objects FOR SELECT USING (bucket_id = 'outlet-images');
DROP POLICY IF EXISTS "Auth users upload outlet images" ON storage.objects;
CREATE POLICY "Auth users upload outlet images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'outlet-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update outlet images" ON storage.objects;
CREATE POLICY "Auth users update outlet images" ON storage.objects FOR UPDATE USING (bucket_id = 'outlet-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete outlet images" ON storage.objects;
CREATE POLICY "Auth users delete outlet images" ON storage.objects FOR DELETE USING (bucket_id = 'outlet-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users upload payment proofs" ON storage.objects;
CREATE POLICY "Auth users upload payment proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owner can view payment proofs" ON storage.objects;
CREATE POLICY "Owner can view payment proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- ===== Realtime =====
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_requests;
EXCEPTION WHEN duplicate_object THEN null; END $$;
