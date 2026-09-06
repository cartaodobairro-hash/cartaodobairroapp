-- 1) activate_subscription_by_email: só service_role (webhook) pode executar
REVOKE EXECUTE ON FUNCTION public.activate_subscription_by_email(text, numeric, text) FROM PUBLIC, anon, authenticated;

-- 2) payments: DELETE apenas para admin
DROP POLICY IF EXISTS payments_own ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated
  USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));
CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY payments_delete_admin ON public.payments FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) seller_commissions: DELETE apenas para admin
DROP POLICY IF EXISTS commissions_own ON public.seller_commissions;
CREATE POLICY commissions_read ON public.seller_commissions FOR SELECT TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid()));
CREATE POLICY commissions_write_admin ON public.seller_commissions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY commissions_update_admin ON public.seller_commissions FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY commissions_delete_admin ON public.seller_commissions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4) seller_goals: DELETE apenas para admin
DROP POLICY IF EXISTS goals_own ON public.seller_goals;
CREATE POLICY goals_read ON public.seller_goals FOR SELECT TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid()));
CREATE POLICY goals_write_admin ON public.seller_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY goals_update_admin ON public.seller_goals FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY goals_delete_admin ON public.seller_goals FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));