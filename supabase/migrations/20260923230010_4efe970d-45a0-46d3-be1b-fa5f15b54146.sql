CREATE TABLE public.case_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.referral_partners(id),
  referred_at timestamptz NOT NULL DEFAULT now(),
  referred_by uuid DEFAULT auth.uid(),
  accepted_at timestamptz,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','accepted','declined','no_response','completed')),
  note text CHECK (note IS NULL OR length(note) <= 2000),
  accept_token text UNIQUE,
  token_expires_at timestamptz,
  responded_at timestamptz
);
CREATE INDEX case_referrals_case_idx ON public.case_referrals(case_id);
GRANT SELECT, INSERT ON public.case_referrals TO authenticated;
GRANT ALL ON public.case_referrals TO service_role;
REVOKE SELECT (accept_token) ON public.case_referrals FROM authenticated;
ALTER TABLE public.case_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editors view referrals" ON public.case_referrals FOR SELECT TO authenticated
  USING (public.can_edit_case(auth.uid(), case_id));
CREATE POLICY "editors add referrals" ON public.case_referrals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_case(auth.uid(), case_id) AND referred_by = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_case_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.case_audit (case_id, case_code, action, actor, changed_fields)
  VALUES (NEW.case_id, (SELECT case_code FROM public.cases WHERE id = NEW.case_id),
          CASE WHEN TG_OP = 'INSERT' THEN 'referral_insert' ELSE 'referral_update' END,
          auth.uid(), ARRAY['partner_id','outcome']);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.audit_case_referral() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER case_referrals_audit AFTER INSERT OR UPDATE ON public.case_referrals
  FOR EACH ROW EXECUTE FUNCTION public.audit_case_referral();

-- staff create a referral: token generated server-side, timeline entry added
CREATE OR REPLACE FUNCTION public.create_case_referral(_case_id uuid, _partner_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE tok text; pname text; rid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_case(auth.uid(), _case_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT name INTO pname FROM public.referral_partners WHERE id = _partner_id AND active;
  IF pname IS NULL THEN RAISE EXCEPTION 'partner not found'; END IF;
  tok := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.case_referrals (case_id, partner_id, referred_by, note, accept_token, token_expires_at)
  VALUES (_case_id, _partner_id, auth.uid(), NULLIF(left(btrim(COALESCE(_note,'')), 2000), ''), tok, now() + interval '48 hours')
  RETURNING id INTO rid;
  INSERT INTO public.case_timeline (case_id, status, note)
  VALUES (_case_id, 'inprogress', 'ส่งต่อไปยัง ' || pname || ' / Referred to ' || pname);
  RETURN jsonb_build_object('id', rid, 'token', tok);
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_case_referral(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_case_referral(uuid, uuid, text) TO authenticated;

-- mark expired pending referrals as no_response (derived at read time too)
