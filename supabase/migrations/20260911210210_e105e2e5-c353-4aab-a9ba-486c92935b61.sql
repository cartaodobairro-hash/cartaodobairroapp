DROP POLICY IF EXISTS partners_public_read ON public.partners;

CREATE POLICY "partners_authenticated_approved_read"
ON public.partners
FOR SELECT
TO authenticated
USING (status = 'aprovado'::public.partner_status);

CREATE VIEW public.partner_directory_public
WITH (security_barrier = true)
AS
SELECT
  id,
  category_id,
  trade_name,
  description,
  instagram,
  website,
  logo_url,
  cover_url,
  state,
  city,
  neighborhood,
  street,
  number,
  complement,
  latitude,
  longitude,
  opening_hours,
  rating,
  reviews_count,
  sponsored,
  status
FROM public.partners
WHERE status = 'aprovado'::public.partner_status;

REVOKE ALL ON public.partner_directory_public FROM PUBLIC;
GRANT SELECT ON public.partner_directory_public TO anon, authenticated, service_role;