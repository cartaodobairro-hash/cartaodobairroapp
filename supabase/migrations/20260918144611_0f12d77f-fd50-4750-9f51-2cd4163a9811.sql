DROP POLICY IF EXISTS "usage_insert" ON public.card_usage;

CREATE POLICY "usage_insert_validated"
ON public.card_usage
FOR INSERT
TO authenticated
WITH CHECK (
  (public.owns_partner(partner_id) OR public.is_admin(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.cards c
    WHERE c.id = card_id
      AND c.customer_id = customer_id
      AND c.status = 'ativo'::public.card_status
  )
  AND (
    benefit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.benefits b
      WHERE b.id = benefit_id
        AND b.partner_id = partner_id
        AND b.status = 'ativo'::public.generic_status
    )
  )
);

DROP POLICY IF EXISTS "cards_own_write" ON public.cards;
DROP POLICY IF EXISTS "cards_admin_insert" ON public.cards;

CREATE POLICY "cards_admin_insert"
ON public.cards
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));