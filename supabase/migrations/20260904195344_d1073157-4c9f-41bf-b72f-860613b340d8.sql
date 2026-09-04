ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

CREATE POLICY "banners_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'banners');

CREATE POLICY "banners_media_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND public.is_admin(auth.uid()));

CREATE POLICY "banners_media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'banners' AND public.is_admin(auth.uid()));

CREATE POLICY "banners_media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND public.is_admin(auth.uid()));