CREATE OR REPLACE FUNCTION public.owns_seller(_seller_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = _seller_id AND s.user_id = auth.uid() AND s.status = 'ativo')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('super_admin','admin')))
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.protect_partner_moderation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.staff_can('parceiros', true) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.sponsored IS DISTINCT FROM OLD.sponsored
     OR NEW.rating IS DISTINCT FROM OLD.rating OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count
     OR NEW.initial_views IS DISTINCT FROM OLD.initial_views THEN
    RAISE EXCEPTION 'Somente a administração pode alterar a aprovação do parceiro.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_partner_moderation ON public.partners;
CREATE TRIGGER protect_partner_moderation BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_moderation();