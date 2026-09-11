-- Restrict customer-created payment records to genuinely pending charges.
DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR (
    public.owns_customer(customer_id)
    AND status = 'pendente'::public.payment_status
    AND paid_at IS NULL
    AND transaction_id IS NULL
    AND amount > 0
    AND subscription_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.id = subscription_id
        AND s.customer_id = payments.customer_id
        AND s.status = 'pendente'::public.generic_status
        AND s.amount = payments.amount
    )
  )
);

-- Sellers may view their own sales, but only admins may write billing fields.
DROP POLICY IF EXISTS sales_own ON public.seller_sales;
CREATE POLICY seller_sales_read
ON public.seller_sales
FOR SELECT
TO authenticated
USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid()));

CREATE POLICY seller_sales_insert_admin
ON public.seller_sales
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY seller_sales_update_admin
ON public.seller_sales
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY seller_sales_delete_admin
ON public.seller_sales
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Customers may request only a pending subscription whose amount matches the selected plan.
-- Activation and all later billing changes remain admin/service controlled.
DROP POLICY IF EXISTS subscriptions_own ON public.subscriptions;
CREATE POLICY subscriptions_read
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));

CREATE POLICY subscriptions_insert
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR (
    public.owns_customer(customer_id)
    AND status = 'pendente'::public.generic_status
    AND payment_method = 'infinitepay'
    AND plan_id IS NOT NULL
    AND amount > 0
    AND amount = (SELECT p.price FROM public.plans p WHERE p.id = plan_id AND p.status = 'ativo'::public.generic_status)
    AND start_date = CURRENT_DATE
  )
);

CREATE POLICY subscriptions_update_admin
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY subscriptions_delete_admin
ON public.subscriptions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));