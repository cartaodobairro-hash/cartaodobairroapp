CREATE OR REPLACE FUNCTION public.activate_subscription_by_email(_email text, _amount numeric DEFAULT NULL, _transaction_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_period text;
  v_next date;
BEGIN
  IF _email IS NULL OR btrim(_email) = '' THEN
    RETURN false;
  END IF;

  SELECT c.* INTO v_customer
  FROM public.customers c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE lower(p.email) = lower(btrim(_email))
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_customer.id IS NULL THEN
    RETURN false;
  END IF;

  IF _transaction_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.payments pay
    WHERE pay.transaction_id = _transaction_id
      AND pay.status = 'pago'
  ) THEN
    RETURN true;
  END IF;

  SELECT s.* INTO v_sub
  FROM public.subscriptions s
  WHERE s.customer_id = v_customer.id
    AND s.status = 'pendente'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.customer_id = v_customer.id
        AND s.status = 'ativo'
    );
  END IF;

  SELECT p.period INTO v_period
  FROM public.plans p
  WHERE p.id = v_sub.plan_id;

  v_next := CASE
    WHEN v_period = 'anual' THEN (CURRENT_DATE + INTERVAL '1 year')::date
    ELSE (CURRENT_DATE + INTERVAL '1 month')::date
  END;

  UPDATE public.customers
  SET status = 'ativo', updated_at = now()
  WHERE id = v_customer.id;

  UPDATE public.subscriptions
  SET status = 'ativo', payment_method = 'infinitepay', next_due_date = v_next, updated_at = now()
  WHERE id = v_sub.id;

  UPDATE public.payments
  SET status = 'pago',
      paid_at = now(),
      method = 'infinitepay',
      amount = COALESCE(_amount, amount),
      transaction_id = COALESCE(_transaction_id, transaction_id)
  WHERE id = (
    SELECT pay.id
    FROM public.payments pay
    WHERE pay.subscription_id = v_sub.id
      AND pay.status = 'pendente'
    ORDER BY pay.created_at ASC
    LIMIT 1
  );

  IF NOT FOUND THEN
    INSERT INTO public.payments (
      customer_id,
      subscription_id,
      amount,
      method,
      transaction_id,
      status,
      paid_at
    ) VALUES (
      v_customer.id,
      v_sub.id,
      COALESCE(_amount, v_sub.amount),
      'infinitepay',
      _transaction_id,
      'pago',
      now()
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_subscription_by_email(text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_by_email(text, numeric, text) TO service_role;