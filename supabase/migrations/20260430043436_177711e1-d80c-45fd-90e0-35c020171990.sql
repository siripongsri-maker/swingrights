-- 1) Private storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-audio', 'case-audio', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Add audio reference columns
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS audio_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.case_timeline
  ADD COLUMN IF NOT EXISTS audio_url text;

-- 3) Storage RLS policies for case-audio bucket
-- Anyone (including anon intake users) can upload to the bucket
DROP POLICY IF EXISTS "anyone can upload case audio" ON storage.objects;
CREATE POLICY "anyone can upload case audio"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'case-audio');

-- Only admins can read/list audio files
DROP POLICY IF EXISTS "admins can read case audio" ON storage.objects;
CREATE POLICY "admins can read case audio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-audio' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can delete audio
DROP POLICY IF EXISTS "admins can delete case audio" ON storage.objects;
CREATE POLICY "admins can delete case audio"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'case-audio' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can update (e.g. metadata) audio
DROP POLICY IF EXISTS "admins can update case audio" ON storage.objects;
CREATE POLICY "admins can update case audio"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'case-audio' AND public.has_role(auth.uid(), 'admin'));