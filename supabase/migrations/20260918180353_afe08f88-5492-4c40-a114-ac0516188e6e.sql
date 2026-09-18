CREATE POLICY customers_seller_read
ON public.customers FOR SELECT TO authenticated
USING (seller_id IS NOT NULL AND public.owns_seller(seller_id));

CREATE POLICY profiles_referred_seller_read
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.user_id = profiles.id AND c.seller_id IS NOT NULL AND public.owns_seller(c.seller_id)
));

CREATE POLICY subscriptions_referred_seller_read
ON public.subscriptions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.id = subscriptions.customer_id AND c.seller_id IS NOT NULL AND public.owns_seller(c.seller_id)
));

CREATE UNIQUE INDEX IF NOT EXISTS seller_commissions_sale_key
ON public.seller_commissions(sale_id) WHERE sale_id IS NOT NULL;