ALTER TABLE public.case_referrals ADD COLUMN IF NOT EXISTS letter jsonb;

CREATE OR REPLACE FUNCTION public.create_case_referral(_case_id uuid, _partner_id uuid, _note text DEFAULT NULL::text, _summary text DEFAULT NULL::text, _letter jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE tok text; pname text; rid uuid; s text; l jsonb := NULL; k text; v text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_case(auth.uid(), _case_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT name INTO pname FROM public.referral_partners WHERE id = _partner_id AND active;
  IF pname IS NULL THEN RAISE EXCEPTION 'partner not found'; END IF;
  s := left(btrim(COALESCE(_summary,'')), 4000);
  s := regexp_replace(s, '\+?\d[\d\s\-]{7,}\d', '[•••]', 'g');
  s := regexp_replace(s, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[•••]', 'g');
  IF _letter IS NOT NULL AND jsonb_typeof(_letter) = 'object' THEN
    l := '{}'::jsonb;
    FOREACH k IN ARRAY ARRAY['overview','details','impact','actions'] LOOP
      v := left(btrim(COALESCE(_letter->>k, '')), 4000);
      v := regexp_replace(v, '\+?\d[\d\s\-]{7,}\d', '[•••]', 'g');
      v := regexp_replace(v, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[•••]', 'g');
      l := l || jsonb_build_object(k, v);
    END LOOP;
  END IF;
  tok := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.case_referrals (case_id, partner_id, referred_by, note, summary, letter, accept_token, token_expires_at)
  VALUES (_case_id, _partner_id, auth.uid(), NULLIF(left(btrim(COALESCE(_note,'')), 2000), ''), NULLIF(s, ''), l, tok, now() + interval '48 hours')
  RETURNING id INTO rid;
  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (_case_id, 'inprogress', 'ส่งต่อไปยัง ' || pname || ' / Referred to ' || pname);
  RETURN jsonb_build_object('id', rid, 'token', tok);
END; $function$;

DROP FUNCTION IF EXISTS public.create_case_referral(uuid, uuid, text, text);