ALTER TABLE public.case_referrals ADD COLUMN IF NOT EXISTS summary text;

DROP FUNCTION IF EXISTS public.create_case_referral(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.create_case_referral(_case_id uuid, _partner_id uuid, _note text DEFAULT NULL::text, _summary text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE tok text; pname text; rid uuid; s text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_case(auth.uid(), _case_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT name INTO pname FROM public.referral_partners WHERE id = _partner_id AND active;
  IF pname IS NULL THEN RAISE EXCEPTION 'partner not found'; END IF;
  -- de-identify: drop long digit runs (ID / phone numbers) and emails
  s := left(btrim(COALESCE(_summary,'')), 4000);
  s := regexp_replace(s, '\+?\d[\d\s\-]{7,}\d', '[•••]', 'g');
  s := regexp_replace(s, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[•••]', 'g');
  tok := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.case_referrals (case_id, partner_id, referred_by, note, summary, accept_token, token_expires_at)
  VALUES (_case_id, _partner_id, auth.uid(), NULLIF(left(btrim(COALESCE(_note,'')), 2000), ''), NULLIF(s, ''), tok, now() + interval '48 hours')
  RETURNING id INTO rid;
  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (_case_id, 'inprogress', 'ส่งต่อไปยัง ' || pname || ' / Referred to ' || pname);
  RETURN jsonb_build_object('id', rid, 'token', tok);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.create_case_referral(uuid, uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_case_referral(uuid, uuid, text, text) TO authenticated;