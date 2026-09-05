-- 1) Restrict card reads
DROP POLICY IF EXISTS cards_own_read ON public.cards;

CREATE POLICY cards_own_read ON public.cards
FOR SELECT TO authenticated
USING (
  public.owns_customer(customer_id)
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.card_usage cu
    WHERE cu.card_id = cards.id
      AND (
        public.owns_partner(cu.partner_id)
        OR EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.partner_id = cu.partner_id
            AND e.user_id = auth.uid()
            AND e.status = 'ativo'
        )
      )
  )
);

-- Secure lookup used by partners/employees to validate a card at the counter
CREATE OR REPLACE FUNCTION public.lookup_card_for_validation(_code text)
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  card_number text,
  status public.card_status,
  expires_at date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.status = 'aprovado')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid() AND e.status = 'ativo' AND e.can_validate
    )
  INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _code IS NULL OR length(btrim(_code)) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.customer_id, c.card_number, c.status, c.expires_at
  FROM public.cards c
  WHERE c.qr_token = btrim(_code) OR c.card_number = btrim(_code)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_card_for_validation(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lookup_card_for_validation(text) TO authenticated;

-- 2) Sellers can only create partners attributed to themselves
DROP POLICY IF EXISTS partners_insert ON public.partners;

CREATE POLICY partners_insert ON public.partners
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  OR public.is_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'seller')
    AND seller_id IS NOT NULL
    AND public.owns_seller(seller_id)
    AND user_id IS NULL
  )
);