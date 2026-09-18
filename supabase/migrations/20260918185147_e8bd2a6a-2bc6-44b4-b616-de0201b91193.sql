DROP POLICY IF EXISTS "usage_insert_validated" ON public.card_usage;

CREATE POLICY "usage_insert_validated"
ON public.card_usage
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.owns_partner(card_usage.partner_id)
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.employees e_actor
      WHERE e_actor.user_id = auth.uid()
        AND e_actor.partner_id = card_usage.partner_id
        AND e_actor.status = 'ativo'::public.generic_status
        AND e_actor.can_validate = true
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.cards c
    WHERE c.id = card_usage.card_id
      AND c.customer_id = card_usage.customer_id
      AND c.status = 'ativo'::public.card_status
  )
  AND (
    card_usage.benefit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.benefits b
      WHERE b.id = card_usage.benefit_id
        AND b.partner_id = card_usage.partner_id
        AND b.status = 'ativo'::public.generic_status
    )
  )
  AND (
    card_usage.dependent_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.dependents d
      WHERE d.id = card_usage.dependent_id
        AND d.customer_id = card_usage.customer_id
        AND d.status = 'ativo'::public.generic_status
        AND d.removed_at IS NULL
    )
  )
  AND (
    card_usage.employee_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = card_usage.employee_id
        AND e.partner_id = card_usage.partner_id
        AND e.status = 'ativo'::public.generic_status
        AND e.can_validate = true
    )
  )
);