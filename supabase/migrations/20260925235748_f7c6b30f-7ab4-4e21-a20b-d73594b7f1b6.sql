DROP POLICY payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR (
    public.owns_customer(customer_id)
    AND status = 'pendente' AND paid_at IS NULL AND transaction_id IS NULL
    AND amount > 0 AND subscription_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.customer_id = payments.customer_id AND s.status IN ('pendente', 'ativo') AND s.amount = payments.amount)
  )
);