-- 0.1 remove demo-admin escalation paths
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.claim_demo_admin() CASCADE;

-- 0.6 audit / access logs
CREATE TABLE IF NOT EXISTS public.case_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  case_code text,
  action text NOT NULL,
  actor uuid,
  changed_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_audit TO authenticated;
GRANT ALL ON public.case_audit TO service_role;
ALTER TABLE public.case_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view audit" ON public.case_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.case_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  case_code text,
  actor uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_access_log TO authenticated;
GRANT ALL ON public.case_access_log TO service_role;
ALTER TABLE public.case_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view access log" ON public.case_access_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_case_access(_case_id uuid, _action text, _detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.case_access_log (case_id, case_code, actor, action, detail)
  VALUES (_case_id, (SELECT case_code FROM public.cases WHERE id = _case_id), auth.uid(), _action, _detail);
END; $$;
REVOKE ALL ON FUNCTION public.log_case_access(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_case_access(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_cases()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fields text[] := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO fields
    FROM jsonb_each(to_jsonb(NEW)) n
    WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);
    INSERT INTO public.case_audit (case_id, case_code, action, actor, changed_fields)
    VALUES (NEW.id, NEW.case_code, 'update', auth.uid(), COALESCE(fields, '{}'));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_audit (case_id, case_code, action, actor)
    VALUES (NEW.id, NEW.case_code, 'insert', auth.uid());
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS cases_audit ON public.cases;
CREATE TRIGGER cases_audit AFTER INSERT OR UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.audit_cases();

-- 0.6 soft delete
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS deleted_by uuid;
DROP POLICY IF EXISTS "admins delete cases" ON public.cases;
REVOKE DELETE ON public.cases FROM authenticated;

-- 0.4 server-side case code + indexes
CREATE UNIQUE INDEX IF NOT EXISTS cases_case_code_key ON public.cases (case_code);
CREATE INDEX IF NOT EXISTS cases_created_at_idx ON public.cases (created_at DESC);
CREATE INDEX IF NOT EXISTS cases_status_idx ON public.cases (status);
CREATE INDEX IF NOT EXISTS cases_branch_idx ON public.cases ((profile->>'branch'));
CREATE INDEX IF NOT EXISTS cases_assigned_idx ON public.cases (assigned_to);

CREATE OR REPLACE FUNCTION public.gen_case_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int; tries int := 0;
BEGIN
  LOOP
    code := 'SW-';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cases WHERE case_code = code);
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'could not generate case code'; END IF;
  END LOOP;
  RETURN code;
END; $$;
REVOKE ALL ON FUNCTION public.gen_case_code() FROM PUBLIC, anon, authenticated;

-- 0.3 rate limiting store
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  ident text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_lookup_idx ON public.rate_limits (bucket, ident, created_at DESC);
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limits_id_seq TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _ident text, _limit int, _window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hits int;
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 day';
  SELECT count(*) INTO hits FROM public.rate_limits
   WHERE bucket = _bucket AND ident = _ident
     AND created_at > now() - make_interval(secs => _window_seconds);
  IF hits >= _limit THEN RETURN false; END IF;
  INSERT INTO public.rate_limits (bucket, ident) VALUES (_bucket, _ident);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, int, int) FROM PUBLIC, anon, authenticated;

-- 0.6 timeline authorship
ALTER TABLE public.case_timeline ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 0.4 controlled write path
CREATE OR REPLACE FUNCTION public.submit_case(_payload jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code text; new_id uuid; sev text;
BEGIN
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid payload';
  END IF;
  IF pg_column_size(_payload) > 400000 THEN
    RAISE EXCEPTION 'payload too large';
  END IF;
  IF COALESCE(_payload->>'consent', 'false') <> 'true' THEN
    RAISE EXCEPTION 'consent required';
  END IF;
  sev := _payload->>'severity';
  IF sev IS NOT NULL AND sev NOT IN ('green','yellow','red') THEN
    RAISE EXCEPTION 'invalid severity';
  END IF;

  code := public.gen_case_code();
  INSERT INTO public.cases (
    case_code, status, severity, has_violation, violation_types, violation_details,
    special_tests, reporter, victim, profile, answers, staff_observations, extra_facts,
    ai_result, referrals, referral_note, signature_staff, signature_staff_name,
    signature_client, signed_at, audio_urls, photo_urls, screening, suicide_risk
  ) VALUES (
    code, 'received', sev,
    (_payload->>'has_violation')::boolean,
    COALESCE(_payload->'violation_types', '[]'::jsonb),
    COALESCE(_payload->'violation_details', '[]'::jsonb),
    COALESCE(_payload->'special_tests', '[]'::jsonb),
    _payload->'reporter', _payload->'victim', _payload->'profile',
    COALESCE(_payload->'answers', '[]'::jsonb),
    COALESCE(_payload->'staff_observations', '[]'::jsonb),
    left(COALESCE(_payload->>'extra_facts', ''), 5000),
    _payload->'ai_result',
    COALESCE(_payload->'referrals', '[]'::jsonb),
    left(COALESCE(_payload->>'referral_note', ''), 2000),
    _payload->>'signature_staff',
    left(COALESCE(_payload->>'signature_staff_name', ''), 200),
    _payload->>'signature_client',
    now(),
    COALESCE(_payload->'audio_urls', '[]'::jsonb),
    COALESCE(_payload->'photo_urls', '[]'::jsonb),
    COALESCE(_payload->'screening', '{}'::jsonb),
    COALESCE((_payload->>'suicide_risk')::boolean, false)
  ) RETURNING id INTO new_id;

  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (new_id, 'received', 'รับเรื่องผ่านแบบฟอร์มคัดกรองด้วยเสียง');

  RETURN code;
END; $$;
REVOKE ALL ON FUNCTION public.submit_case(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_case(jsonb) TO anon, authenticated;

-- close direct anonymous write paths now that submit_case exists
DROP POLICY IF EXISTS "anyone can insert cases" ON public.cases;
DROP POLICY IF EXISTS "anyone can insert timeline" ON public.case_timeline;
REVOKE INSERT ON public.cases FROM anon;
REVOKE INSERT ON public.case_timeline FROM anon;
CREATE POLICY "staff add timeline" ON public.case_timeline FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));