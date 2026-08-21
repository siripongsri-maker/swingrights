-- 1) cases: track report source + language
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS report_language text NOT NULL DEFAULT 'th';

ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_source_check,
  ADD CONSTRAINT cases_source_check CHECK (source IN ('staff','self'));
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_report_language_check,
  ADD CONSTRAINT cases_report_language_check CHECK (report_language IN ('th','en','my','km','lo'));

-- 2) referral partner network (per-area organizations)
CREATE TABLE IF NOT EXISTS public.referral_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  org_type text NOT NULL DEFAULT 'ngo',
  province text,
  district text,
  phone text,
  email text,
  address text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.referral_partners TO authenticated;
GRANT ALL ON public.referral_partners TO service_role;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view partners" ON public.referral_partners
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));
CREATE POLICY "admins manage partners" ON public.referral_partners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS referral_partners_updated_at ON public.referral_partners;
CREATE TRIGGER referral_partners_updated_at BEFORE UPDATE ON public.referral_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS referral_partners_province_idx ON public.referral_partners (province) WHERE active;

-- 3) follow-up questions on a case (staff asks, reporter answers without an account)
CREATE TABLE IF NOT EXISTS public.case_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  question text NOT NULL,
  asked_by uuid DEFAULT auth.uid(),
  answer_text text,
  answer_audio_url text,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.case_questions TO authenticated;
GRANT UPDATE ON public.case_questions TO authenticated;
GRANT ALL ON public.case_questions TO service_role;
ALTER TABLE public.case_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view questions" ON public.case_questions
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));
CREATE POLICY "staff add questions" ON public.case_questions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "managers edit questions" ON public.case_questions
  FOR UPDATE TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

DROP TRIGGER IF EXISTS case_questions_updated_at ON public.case_questions;
CREATE TRIGGER case_questions_updated_at BEFORE UPDATE ON public.case_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS case_questions_case_idx ON public.case_questions (case_id);

-- 4) public answer RPC (no direct anon table access; validated + rate limited)
CREATE OR REPLACE FUNCTION public.answer_case_question(
  _case_code text,
  _question_id uuid,
  _answer_text text,
  _answer_audio_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cid uuid;
BEGIN
  IF _case_code IS NULL OR length(_case_code) > 32 THEN
    RAISE EXCEPTION 'invalid case code';
  END IF;
  IF NOT public.check_rate_limit('answer-question', _case_code, 30, 3600) THEN
    RAISE EXCEPTION 'rate limited';
  END IF;
  SELECT id INTO cid FROM public.cases WHERE case_code = _case_code AND deleted_at IS NULL;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'case not found';
  END IF;
  UPDATE public.case_questions
     SET answer_text = left(COALESCE(_answer_text, ''), 5000),
         answer_audio_url = CASE
           WHEN _answer_audio_url ~ '^cases/[A-Za-z0-9-]{6,64}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$' THEN _answer_audio_url
           ELSE NULL END,
         answered_at = now()
   WHERE id = _question_id AND case_id = cid AND answered_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found or already answered';
  END IF;
  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (cid, 'answer_received', 'ผู้รายงานตอบคำถามเพิ่มเติม');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.answer_case_question(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.answer_case_question(text, uuid, text, text) TO anon, authenticated;

-- 5) submit_case: accept source + language
CREATE OR REPLACE FUNCTION public.submit_case(_payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    source, report_language
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
    src, lang
  ) RETURNING id INTO new_id;

  INSERT INTO public.case_pii (case_id, reporter, victim)
  VALUES (new_id, _payload->'reporter', _payload->'victim');

  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (new_id, 'received', CASE WHEN src = 'self'
    THEN 'รายงานด้วยตนเองผ่านแบบฟอร์มออนไลน์'
    ELSE 'รับเรื่องผ่านแบบฟอร์มคัดกรองด้วยเสียง' END);

  RETURN code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_case(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_case(jsonb) TO anon, authenticated;