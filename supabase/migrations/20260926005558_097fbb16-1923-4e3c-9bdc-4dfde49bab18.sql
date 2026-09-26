ALTER TABLE public.benefits ADD COLUMN image_url text;

CREATE POLICY benefit_images_read ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'benefit-images' AND (
    EXISTS (SELECT 1 FROM public.benefits b JOIN public.partners p ON p.id = b.partner_id WHERE b.image_url = storage.objects.name AND b.status = 'ativo' AND p.status = 'aprovado')
    OR (auth.uid() IS NOT NULL AND (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id::text = (storage.foldername(name))[1] AND p.user_id = auth.uid())))
  )
);
CREATE POLICY benefit_images_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'benefit-images' AND storage.extension(name) IN ('jpg', 'jpeg', 'png')
  AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id::text = (storage.foldername(name))[1] AND p.user_id = auth.uid())
);
CREATE POLICY benefit_images_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'benefit-images' AND (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id::text = (storage.foldername(name))[1] AND p.user_id = auth.uid()))
);