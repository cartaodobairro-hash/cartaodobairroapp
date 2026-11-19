CREATE OR REPLACE FUNCTION public.protect_partner_moderation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.staff_can('parceiros', true) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.sponsored IS DISTINCT FROM OLD.sponsored
     OR NEW.initial_views IS DISTINCT FROM OLD.initial_views THEN
    RAISE EXCEPTION 'Somente a administração pode alterar a aprovação do parceiro.';
  END IF;
  RETURN NEW;
END $$;