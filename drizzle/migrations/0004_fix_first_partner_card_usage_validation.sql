CREATE OR REPLACE FUNCTION public.can_register_card_usage(_card_id uuid, _customer_id uuid, _partner_id uuid, _benefit_id uuid, _dependent_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.owns_partner(_partner_id)
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.employees actor
        WHERE actor.user_id = auth.uid() AND actor.partner_id = _partner_id
          AND actor.status = 'ativo' AND actor.can_validate = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.cards card
      WHERE card.id = _card_id AND card.customer_id = _customer_id AND card.status = 'ativo'
    )
    AND (_benefit_id IS NULL OR EXISTS (
      SELECT 1 FROM public.benefits benefit
      WHERE benefit.id = _benefit_id AND benefit.partner_id = _partner_id AND benefit.status = 'ativo'
    ))
    AND (_dependent_id IS NULL OR EXISTS (
      SELECT 1 FROM public.dependents dependent
      WHERE dependent.id = _dependent_id AND dependent.customer_id = _customer_id
        AND dependent.status = 'ativo' AND dependent.removed_at IS NULL
    ))
    AND (_employee_id IS NULL OR EXISTS (
      SELECT 1 FROM public.employees employee
      WHERE employee.id = _employee_id AND employee.partner_id = _partner_id
        AND employee.status = 'ativo' AND employee.can_validate = true
    ));
$$;
REVOKE ALL ON FUNCTION public.can_register_card_usage(uuid, uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_register_card_usage(uuid, uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.can_register_card_usage(uuid, uuid, uuid, uuid, uuid, uuid) IS 'Checks caller authorization and all usage associations without cards SELECT RLS hiding first-use cards. Returns only a boolean; does not grant card browsing.';
ALTER POLICY usage_insert_validated ON public.card_usage
WITH CHECK (public.can_register_card_usage(card_id, customer_id, partner_id, benefit_id, dependent_id, employee_id));