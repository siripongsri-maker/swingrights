CREATE TABLE public.case_drafts (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  media jsonb NOT NULL DEFAULT '{"audio":[],"photos":[]}'::jsonb,
  language text NOT NULL DEFAULT 'th',
  source text NOT NULL DEFAULT 'staff',
  case_id uuid REFERENCES public.cases(id),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_drafts TO authenticated;
GRANT ALL ON public.case_drafts TO service_role;
ALTER TABLE public.case_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view drafts" ON public.case_drafts FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()) AND NOT public.has_role(auth.uid(),'viewer'));
CREATE INDEX case_drafts_updated_idx ON public.case_drafts(updated_at);

CREATE OR REPLACE FUNCTION public.save_case_draft(_draft_id uuid, _token text, _data jsonb, _media jsonb, _language text DEFAULT 'th', _source text DEFAULT 'staff')
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE h text; existing text; ts timestamptz := now();
BEGIN
  IF _draft_id IS NULL OR _token IS NULL OR length(_token) < 32 OR length(_token) > 128 THEN RAISE EXCEPTION 'invalid draft'; END IF;
  IF pg_column_size(_data) + pg_column_size(_media) > 300000 THEN RAISE EXCEPTION 'payload too large'; END IF;
  IF NOT public.check_rate_limit('save-draft', _draft_id::text, 240, 3600) THEN RAISE EXCEPTION 'rate limited'; END IF;
  DELETE FROM public.case_drafts WHERE submitted_at IS NULL AND updated_at < now() - interval '30 days';
  h := encode(digest(_token, 'sha256'), 'hex');
  SELECT token_hash INTO existing FROM public.case_drafts WHERE id = _draft_id;
  IF existing IS NOT NULL AND existing <> h THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.case_drafts (id, token_hash, data, media, language, source, updated_at)
  VALUES (_draft_id, h, COALESCE(_data,'{}'::jsonb) - 'reporter' - 'victim',
          COALESCE(_media,'{"audio":[],"photos":[]}'::jsonb),
          CASE WHEN _language IN ('th','en','my','km','lo') THEN _language ELSE 'th' END,
          CASE WHEN _source IN ('staff','self') THEN _source ELSE 'staff' END, ts)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, media = EXCLUDED.media,
    language = EXCLUDED.language, updated_at = ts
  WHERE public.case_drafts.submitted_at IS NULL;
  RETURN ts;
END $$;

CREATE OR REPLACE FUNCTION public.get_case_draft(_draft_id uuid, _token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.check_rate_limit('get-draft', _draft_id::text, 60, 3600) THEN RAISE EXCEPTION 'rate limited'; END IF;
  SELECT jsonb_build_object('data', data, 'media', media, 'updated_at', updated_at, 'submitted', submitted_at IS NOT NULL)
    INTO r FROM public.case_drafts
   WHERE id = _draft_id AND token_hash = encode(digest(_token, 'sha256'), 'hex');
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.link_case_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN NEW; END $$;

-- submit_case: mark draft submitted when payload carries draft_id + draft_token
CREATE OR REPLACE FUNCTION public.finish_case_draft(_draft_id uuid, _token text, _case_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  UPDATE public.case_drafts d SET submitted_at = now(),
    case_id = (SELECT id FROM public.cases WHERE case_code = _case_code)
   WHERE d.id = _draft_id AND d.token_hash = encode(digest(_token, 'sha256'), 'hex') AND d.submitted_at IS NULL;
END $$;
DROP FUNCTION public.link_case_draft();

GRANT EXECUTE ON FUNCTION public.save_case_draft(uuid,text,jsonb,jsonb,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_case_draft(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_case_draft(uuid,text,text) TO anon, authenticated;