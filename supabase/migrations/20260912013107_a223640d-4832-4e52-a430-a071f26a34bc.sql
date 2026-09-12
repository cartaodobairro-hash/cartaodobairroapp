UPDATE public.plans
SET payment_link = 'https://invoice.infinitepay.io/plans/cartao-do-bairro/h83nv5nvwI'
WHERE name = 'Individual'
  AND price = 9.90
  AND period = 'mensal';