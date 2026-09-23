ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS pii_flag boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.submit_case(_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code text; new_id uuid; sev text; src text; lang text;
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
  src := COALESCE(_payload->>'source', 'staff');
  IF src NOT IN ('staff','self') THEN
    RAISE EXCEPTION 'invalid source';
  END IF;
  lang := COALESCE(_payload->>'language', 'th');
  IF lang NOT IN ('th','en','my','km','lo') THEN
    RAISE EXCEPTION 'invalid language';
  END IF;

  code := public.gen_case_code();
  INSERT INTO public.cases (
    case_code, status, severity, has_violation, violation_types, violation_details,
    special_tests, reporter, victim, profile, answers, staff_observations, extra_facts,
    ai_result, referrals, referral_note, signature_staff, signature_staff_name,
    signature_client, signed_at, audio_urls, photo_urls, screening, suicide_risk,
    source, report_language, pii_flag
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
    COALESCE((_payload->>'suicide_risk')::boolean, false),
    src, lang,
    COALESCE((_payload->>'pii_flag')::boolean, false)
  ) RETURNING id INTO new_id;

  INSERT INTO public.case_pii (case_id, reporter, victim)
  VALUES (new_id, _payload->'reporter', _payload->'victim');

  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (new_id, 'received', CASE WHEN src = 'self'
    THEN 'รายงานด้วยตนเองผ่านแบบฟอร์มออนไลน์'
    ELSE 'รับเรื่องผ่านแบบฟอร์มคัดกรองด้วยเสียง' END);

  RETURN code;
END;
$function$;