ALTER TABLE public.staff_profiles DROP CONSTRAINT staff_profiles_status_chk;
ALTER TABLE public.staff_profiles ADD CONSTRAINT staff_profiles_status_chk CHECK (status = ANY (ARRAY['active','suspended','pending','rejected']));
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS request_note text;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS requested_at timestamptz;

-- Signed-in user asks to become staff. Creates a pending profile only; no role, so no case access until an admin approves.
CREATE OR REPLACE FUNCTION public.request_staff_access(_display_name text, _note text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); uemail text; cur text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid AND email_confirmed_at IS NOT NULL;
  IF uemail IS NULL THEN RAISE EXCEPTION 'email_not_confirmed'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RETURN COALESCE((SELECT status FROM public.staff_profiles WHERE id = uid), 'active');
  END IF;
  IF NOT public.check_rate_limit('staff_request', uid::text, 5, 3600) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  SELECT status INTO cur FROM public.staff_profiles WHERE id = uid;
  IF cur IS NULL THEN
    INSERT INTO public.staff_profiles (id, email, display_name, status, request_note, requested_at)
    VALUES (uid, uemail, left(COALESCE(NULLIF(btrim(_display_name),''), split_part(uemail,'@',1)), 120), 'pending', left(_note, 500), now());
    RETURN 'pending';
  END IF;
  RETURN cur;
END $$;

REVOKE ALL ON FUNCTION public.request_staff_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_staff_access(text, text) TO authenticated;