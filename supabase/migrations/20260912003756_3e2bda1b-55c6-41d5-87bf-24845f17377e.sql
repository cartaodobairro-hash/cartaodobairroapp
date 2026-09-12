ALTER TABLE public.card_usage
  ADD COLUMN purchase_amount numeric(12,2);

ALTER TABLE public.card_usage
  ADD CONSTRAINT card_usage_purchase_amount_nonnegative
  CHECK (purchase_amount IS NULL OR purchase_amount >= 0),
  ADD CONSTRAINT card_usage_amount_saved_nonnegative
  CHECK (amount_saved >= 0),
  ADD CONSTRAINT card_usage_discount_not_above_purchase
  CHECK (purchase_amount IS NULL OR amount_saved <= purchase_amount);

COMMENT ON COLUMN public.card_usage.purchase_amount IS
  'Valor bruto da compra informado no atendimento; dado exclusivamente analítico, sem integração com o fluxo de caixa.';