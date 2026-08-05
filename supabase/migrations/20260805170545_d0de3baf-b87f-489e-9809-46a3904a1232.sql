CREATE TABLE IF NOT EXISTS public.case_pii (
  case_id uuid PRIMARY KEY REFERENCES public.cases(id) ON DELETE CASCADE,
  reporter jsonb,
  victim jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.case_pii TO service_role;

ALTER TABLE public.case_pii ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct pii access" ON public.case_pii FOR SELECT TO authenticated USING (false);

CREATE TRIGGER case_pii_updated_at BEFORE UPDATE ON public.case_pii
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.case_pii (case_id, reporter, victim)
SELECT id, reporter, victim FROM public.cases
WHERE reporter IS NOT NULL OR victim IS NOT NULL
ON CONFLICT (case_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mask_name(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _name IS NULL OR btrim(_name) = '' THEN NULL
    ELSE left(btrim(_name), 1) || repeat('•', greatest(length(btrim(_name)) - 1, 1))
  END
$$;

UPDATE public.cases c
SET reporter = NULL,
    victim = jsonb_strip_nulls(jsonb_build_object('name_masked', public.mask_name(c.victim->>'name')));

CREATE OR REPLACE FUNCTION public.get_case_pii(_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT (public.can_manage(auth.uid()) OR public.can_edit_case(auth.uid(), _case_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object('reporter', COALESCE(p.reporter,'{}'::jsonb), 'victim', COALESCE(p.victim,'{}'::jsonb))
    INTO res FROM public.case_pii p WHERE p.case_id = _case_id;
  PERFORM public.log_case_access(_case_id, 'view_pii', NULL);
  RETURN COALESCE(res, jsonb_build_object('reporter','{}'::jsonb,'victim','{}'::jsonb));
END; $$;

GRANT EXECUTE ON FUNCTION public.get_case_pii(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_case(_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    NULL,
    jsonb_strip_nulls(jsonb_build_object('name_masked', public.mask_name(_payload->'victim'->>'name'))),
    _payload->'profile',
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

  INSERT INTO public.case_pii (case_id, reporter, victim)
  VALUES (new_id, _payload->'reporter', _payload->'victim');

  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (new_id, 'received', 'รับเรื่องผ่านแบบฟอร์มคัดกรองด้วยเสียง');

  RETURN code;
END; $function$;