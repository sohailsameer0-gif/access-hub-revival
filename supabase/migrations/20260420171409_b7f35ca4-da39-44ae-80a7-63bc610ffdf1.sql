-- Permanently bind admin role to the official admin email.
-- Whenever a user with this email exists (now or after future signups
-- on any deployment), they automatically get the admin role.

-- 1) Ensure the current admin user has the admin role (idempotent).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('sohailsameer0@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Trigger function: on new auth user signup, if email matches the
--    permanent admin email, grant admin role automatically.
CREATE OR REPLACE FUNCTION public.ensure_permanent_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND lower(NEW.email) = lower('sohailsameer0@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Attach trigger AFTER INSERT on auth.users (runs after handle_new_user).
DROP TRIGGER IF EXISTS ensure_permanent_admin_trigger ON auth.users;
CREATE TRIGGER ensure_permanent_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_permanent_admin();

-- 4) Add a unique constraint on (user_id, role) if not already present,
--    so ON CONFLICT works reliably.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;