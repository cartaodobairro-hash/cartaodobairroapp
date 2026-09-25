DROP POLICY IF EXISTS "banners_media_read" ON storage.objects;
CREATE POLICY "banners_media_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banners' AND public.is_admin((SELECT auth.uid())));