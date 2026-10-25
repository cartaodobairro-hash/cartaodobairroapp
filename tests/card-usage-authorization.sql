-- All returned assertions must be true; no attendance is inserted.
WITH fixture AS MATERIALIZED (
  SELECT c.id AS card_id, c.customer_id, p.id AS partner_id, p.user_id, b.id AS benefit_id
  FROM public.cards c
  CROSS JOIN public.partners p
  JOIN public.benefits b ON b.partner_id = p.id AND b.status = 'ativo'
  WHERE c.status = 'ativo' AND p.status = 'aprovado' AND p.user_id IS NOT NULL
  LIMIT 1
), actor AS MATERIALIZED (
  SELECT *, set_config('request.jwt.claim.sub', user_id::text, true) AS claim FROM fixture
)
SELECT
  public.can_register_card_usage(card_id, customer_id, partner_id, benefit_id, NULL, NULL) AS attendance_allowed,
  public.can_register_card_usage(card_id, customer_id, partner_id, NULL, NULL, NULL) AS uncatalogued_product_allowed,
  NOT public.can_register_card_usage(card_id, '00000000-0000-0000-0000-000000000000', partner_id, benefit_id, NULL, NULL) AS wrong_customer_rejected,
  NOT public.can_register_card_usage(card_id, customer_id, '00000000-0000-0000-0000-000000000000', benefit_id, NULL, NULL) AS wrong_partner_rejected,
  NOT public.can_register_card_usage(card_id, customer_id, partner_id, '00000000-0000-0000-0000-000000000000', NULL, NULL) AS wrong_benefit_rejected,
  NOT public.can_register_card_usage(card_id, customer_id, partner_id, benefit_id, '00000000-0000-0000-0000-000000000000', NULL) AS wrong_dependent_rejected,
  NOT public.can_register_card_usage(card_id, customer_id, partner_id, benefit_id, NULL, '00000000-0000-0000-0000-000000000000') AS wrong_employee_rejected,
  NOT public.can_register_card_usage('00000000-0000-0000-0000-000000000000', customer_id, partner_id, benefit_id, NULL, NULL) AS wrong_card_rejected
FROM actor WHERE claim = user_id::text;