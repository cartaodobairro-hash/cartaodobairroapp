CREATE OR REPLACE FUNCTION public.delete_subscription_with_payments(_subscription_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _subscription_id IS NULL THEN
    RAISE EXCEPTION 'Assinatura inválida';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = _subscription_id
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.payments
  WHERE subscription_id = _subscription_id;

  DELETE FROM public.subscriptions
  WHERE id = _subscription_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_subscription_with_payments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_subscription_with_payments(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_subscription_with_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subscription_with_payments(uuid) TO service_role;