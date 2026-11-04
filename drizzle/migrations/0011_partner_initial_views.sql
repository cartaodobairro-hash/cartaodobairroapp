ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS initial_views integer NOT NULL DEFAULT 0;
UPDATE public.partners SET initial_views = 30 + floor(random()*21)::int WHERE initial_views = 0;
ALTER TABLE public.partners ALTER COLUMN initial_views SET DEFAULT (30 + floor(random()*21)::int);
CREATE OR REPLACE FUNCTION public.get_partner_view_stats(_partner_id uuid)
RETURNS TABLE(total bigint, unique_viewers bigint, last_30_days bigint, last_7_days bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _base bigint;
BEGIN
  IF NOT (public.owns_partner(_partner_id) OR public.is_admin(auth.uid()) OR public.staff_can('parceiros', false)) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(initial_views,0) INTO _base FROM partners WHERE id = _partner_id;
  _base := COALESCE(_base,0);
  RETURN QUERY SELECT count(*) + _base, count(DISTINCT viewer_id) + _base,
    count(*) FILTER (WHERE viewed_at > now() - interval '30 days') + _base,
    count(*) FILTER (WHERE viewed_at > now() - interval '7 days')
  FROM partner_profile_views WHERE partner_id = _partner_id;
END $$;