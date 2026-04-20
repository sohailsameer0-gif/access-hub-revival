CREATE OR REPLACE FUNCTION public._gen_otp_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v int;
BEGIN
  v := floor(random() * 900000)::int + 100000;
  RETURN v::text;
END;
$$;