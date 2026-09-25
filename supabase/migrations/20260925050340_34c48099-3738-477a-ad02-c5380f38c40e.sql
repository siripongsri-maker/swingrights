CREATE TABLE public.ai_training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  lang text NOT NULL DEFAULT 'th',
  question text NOT NULL DEFAULT '',
  answer text NOT NULL DEFAULT '',
  followup text NOT NULL DEFAULT '',
  covered text[] NOT NULL DEFAULT '{}',
  next_slot text,
  staff_rating text CHECK (staff_rating IN ('good','repeat','bad')),
  rated_by uuid,
  rated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_training_samples (session_id);
CREATE INDEX ON public.ai_training_samples (case_id);
GRANT SELECT ON public.ai_training_samples TO authenticated;
GRANT ALL ON public.ai_training_samples TO service_role;
ALTER TABLE public.ai_training_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active staff read training samples" ON public.ai_training_samples
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.link_training_session(_session uuid, _case_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.check_rate_limit('link-training', _session::text, 10, 3600) THEN RETURN; END IF;
  UPDATE public.ai_training_samples SET case_id = (SELECT id FROM public.cases WHERE case_code = _case_code AND deleted_at IS NULL)
   WHERE session_id = _session AND case_id IS NULL AND created_at > now() - interval '1 day';
END $$;

CREATE OR REPLACE FUNCTION public.rate_training_sample(_id uuid, _rating text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _rating IS NOT NULL AND _rating NOT IN ('good','repeat','bad') THEN RAISE EXCEPTION 'invalid rating'; END IF;
  UPDATE public.ai_training_samples SET staff_rating = _rating, rated_by = auth.uid(), rated_at = now() WHERE id = _id;
END $$;

-- unlinked samples expire after 30 days
CREATE OR REPLACE FUNCTION public.purge_unlinked_training()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.ai_training_samples WHERE case_id IS NULL AND created_at < now() - interval '30 days';
$$;