UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/aac']
WHERE id = 'case-audio';

DROP POLICY IF EXISTS "anyone can upload case audio" ON storage.objects;
CREATE POLICY "anyone can upload case audio"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'case-audio' AND (storage.foldername(name))[1] = 'cases');