-- 1) sellers_public_pii_exposure: remove leitura pública total da tabela sellers
DROP POLICY IF EXISTS sellers_public_read ON public.sellers;

-- Leitura restrita: o próprio vendedor ou admins
CREATE POLICY sellers_self_read ON public.sellers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 2) audit_logs_insert_spoofing: user_id deve ser o do próprio autor
DROP POLICY IF EXISTS logs_insert ON public.audit_logs;

CREATE POLICY logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3) SUPA_authenticated_security_definer_function_executable:
-- revoga EXECUTE de funções SECURITY DEFINER que não precisam ser chamadas via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_card_with_subscription() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_dependent_limit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_customer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_partner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_seller(uuid) FROM anon;