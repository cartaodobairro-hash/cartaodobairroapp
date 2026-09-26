DROP POLICY IF EXISTS benefit_images_read ON storage.objects;
CREATE POLICY benefit_images_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'benefit-images'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
  )
);