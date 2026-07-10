
-- Allow anyone (including anon/service) to upload and read within candidate-photos bucket
CREATE POLICY "candidate_photos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-photos');

CREATE POLICY "candidate_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'candidate-photos');

CREATE POLICY "candidate_photos_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'candidate-photos');

CREATE POLICY "candidate_photos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'candidate-photos');
