DROP VIEW IF EXISTS public.partner_directory_public;

DROP POLICY IF EXISTS partners_authenticated_approved_read ON public.partners;

CREATE POLICY "partners_public_read"
ON public.partners
FOR SELECT
TO anon, authenticated
USING (status = 'aprovado'::public.partner_status);

REVOKE ALL ON public.partners FROM anon;
GRANT SELECT (
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
  status,
  created_at,
  updated_at
) ON public.partners TO anon;