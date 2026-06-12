ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "anyone can upload case photos" ON storage.objects;
CREATE POLICY "anyone can upload case photos"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'case-photos' AND (storage.foldername(name))[1] = 'cases');

DROP POLICY IF EXISTS "admins can read case photos" ON storage.objects;
CREATE POLICY "admins can read case photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-photos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins can delete case photos" ON storage.objects;
CREATE POLICY "admins can delete case photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'case-photos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins can update case photos" ON storage.objects;
CREATE POLICY "admins can update case photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'case-photos' AND public.has_role(auth.uid(), 'admin'));