CREATE OR REPLACE FUNCTION public.request_staff_access(_display_name text, _note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); uemail text; cur text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid AND email_confirmed_at IS NOT NULL;
  IF uemail IS NULL THEN RAISE EXCEPTION 'email_not_confirmed'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RETURN COALESCE((SELECT status FROM public.staff_profiles WHERE id = uid), 'active');
  END IF;
  SELECT status INTO cur FROM public.staff_profiles WHERE id = uid;
  IF cur IN ('pending','rejected','suspended') THEN RETURN cur; END IF;
  IF NOT public.check_rate_limit('staff_request', uid::text, 5, 3600) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  -- No role: a placeholder 'active' profile (auto-created) or none at all becomes a pending request
  INSERT INTO public.staff_profiles (id, email, display_name, status, request_note, requested_at)
  VALUES (uid, uemail, left(COALESCE(NULLIF(btrim(_display_name),''), split_part(uemail,'@',1)), 120), 'pending', left(_note, 500), now())
  ON CONFLICT (id) DO UPDATE SET status='pending',
    display_name = COALESCE(NULLIF(left(btrim(_display_name),120),''), staff_profiles.display_name),
    request_note = left(_note, 500), requested_at = now();
  RETURN 'pending';
END $$;
REVOKE ALL ON FUNCTION public.request_staff_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_staff_access(text, text) TO authenticated;