CREATE OR REPLACE FUNCTION public.case_id_for_file(_bucket text, _name text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.cases c
  WHERE c.deleted_at IS NULL AND (
    (_bucket = 'case-audio' AND (
       EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(c.audio_urls,'[]')) e
               WHERE (CASE jsonb_typeof(e) WHEN 'string' THEN e #>> '{}' ELSE e->>'path' END) = _name)
       OR EXISTS (SELECT 1 FROM public.case_questions q WHERE q.case_id = c.id AND q.answer_audio_url = _name)
       OR EXISTS (SELECT 1 FROM public.case_timeline t WHERE t.case_id = c.id AND t.audio_url = _name)))
    OR (_bucket = 'case-photos' AND
       EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(c.photo_urls,'[]')) e
               WHERE (CASE jsonb_typeof(e) WHEN 'string' THEN e #>> '{}' ELSE e->>'path' END) = _name))
  ) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_access_case_file(_user_id uuid, _bucket text, _name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  cid := public.case_id_for_file(_bucket, _name);
  IF cid IS NULL THEN RETURN public.has_role(_user_id, 'admin') AND public.can_manage(_user_id); END IF;
  RETURN public.can_manage(_user_id) OR public.can_edit_case(_user_id, cid);
END $$;

REVOKE EXECUTE ON FUNCTION public.case_id_for_file(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_case_file(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_case_file(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "admins can read case audio" ON storage.objects;
DROP POLICY IF EXISTS "admins can read case photos" ON storage.objects;
CREATE POLICY "authorized staff read case audio" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-audio' AND public.can_access_case_file(auth.uid(), bucket_id, name));
CREATE POLICY "authorized staff read case photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-photos' AND public.can_access_case_file(auth.uid(), bucket_id, name));