CREATE OR REPLACE FUNCTION public.activate_subscription_by_id(_subscription_id uuid, _amount numeric DEFAULT NULL::numeric, _transaction_id text DEFAULT NULL::text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_period text;
  v_next date;
  v_payment_id uuid;
BEGIN
  IF _subscription_id IS NULL OR _transaction_id IS NULL OR btrim(_transaction_id) = '' OR _amount IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = _subscription_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE transaction_id = _transaction_id AND status = 'pago') THEN
    RETURN EXISTS (SELECT 1 FROM public.payments WHERE transaction_id = _transaction_id AND subscription_id = _subscription_id AND status = 'pago');
  END IF;
  SELECT id INTO v_payment_id FROM public.payments
  WHERE subscription_id = _subscription_id AND status = 'pendente' AND amount = _amount
  ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_payment_id IS NULL THEN RETURN false; END IF;
  SELECT period INTO v_period FROM public.plans WHERE id = v_sub.plan_id;
  v_next := CASE WHEN v_period = 'anual' THEN (GREATEST(CURRENT_DATE, v_sub.next_due_date) + INTERVAL '1 year')::date
    ELSE (GREATEST(CURRENT_DATE, v_sub.next_due_date) + INTERVAL '1 month')::date END;
  UPDATE public.payments SET status = 'pago', paid_at = now(), method = 'infinitepay', transaction_id = _transaction_id WHERE id = v_payment_id;
  UPDATE public.customers SET status = 'ativo', updated_at = now() WHERE id = v_sub.customer_id;
  UPDATE public.subscriptions SET status = 'ativo', payment_method = 'infinitepay', next_due_date = v_next, updated_at = now() WHERE id = v_sub.id;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.activate_subscription_by_id(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_by_id(uuid,numeric,text) TO service_role;