DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (status = 'ativo');

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (status = 'ativo');

DROP POLICY IF EXISTS "settings_read" ON public.app_settings;
REVOKE SELECT ON public.app_settings FROM anon;

DROP POLICY IF EXISTS "banners_media_read" ON storage.objects;
CREATE POLICY "banners_media_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'banners'
  AND (
    public.is_admin((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.banners AS b
      WHERE b.image_url = storage.objects.name AND b.status = 'ativo'
    )
  )
);