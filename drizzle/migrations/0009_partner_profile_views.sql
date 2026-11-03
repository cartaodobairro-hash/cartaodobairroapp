CREATE TABLE public.partner_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  viewer_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_profile_views_partner_idx ON public.partner_profile_views(partner_id, viewed_at DESC);
GRANT ALL ON public.partner_profile_views TO service_role;
ALTER TABLE public.partner_profile_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_partner_view(_partner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners WHERE id = _partner_id AND status = 'aprovado') THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM partners WHERE id = _partner_id AND user_id = auth.uid()) THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM partner_profile_views
     WHERE partner_id = _partner_id AND viewer_id = auth.uid() AND viewed_at > now() - interval '30 minutes') THEN RETURN; END IF;
  INSERT INTO partner_profile_views(partner_id, viewer_id) VALUES (_partner_id, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public.record_partner_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_partner_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_view_stats(_partner_id uuid)
RETURNS TABLE(total bigint, unique_viewers bigint, last_30_days bigint, last_7_days bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.owns_partner(_partner_id) OR public.is_admin(auth.uid()) OR public.staff_can('parceiros', false)) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT count(*), count(DISTINCT viewer_id),
    count(*) FILTER (WHERE viewed_at > now() - interval '30 days'),
    count(*) FILTER (WHERE viewed_at > now() - interval '7 days')
  FROM partner_profile_views WHERE partner_id = _partner_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_partner_view_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_view_stats(uuid) TO authenticated;