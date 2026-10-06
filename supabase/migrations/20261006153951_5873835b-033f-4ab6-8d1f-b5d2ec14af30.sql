CREATE TABLE public.staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_staff_members_updated BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.staff_can(_module text, _edit boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members s
    WHERE s.user_id = auth.uid() AND s.status = 'ativo'
      AND (s.permissions->>_module = 'edit' OR (NOT _edit AND s.permissions->>_module = 'view'))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.staff_can(text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.staff_can(text, boolean) TO authenticated;

CREATE POLICY staff_members_read ON public.staff_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.staff_can('equipe', false));

DO $$
DECLARE m record;
BEGIN
  FOR m IN SELECT * FROM (VALUES
    ('planos','plans'),('parceiros','partners'),('parceiros','benefits'),('parceiros','employees'),
    ('clientes','customers'),('clientes','profiles'),('clientes','dependents'),('clientes','cards'),('clientes','card_usage'),
    ('assinaturas','subscriptions'),('assinaturas','payments'),
    ('vendedores','sellers'),('vendedores','seller_sales'),('vendedores','seller_commissions'),('vendedores','seller_goals'),('vendedores','seller_leads'),
    ('categorias','categories'),('banners','banners'),
    ('financeiro','payments'),('financeiro','seller_commissions'),
    ('fluxo','cash_flow_entries'),('fluxo','cash_flow_categories'),('fluxo','cash_flow_balances'),('fluxo','seller_commissions'),
    ('suporte','support_tickets')
  ) AS t(module, tbl) LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.staff_can(%L, false))', 'staff_view_'||m.module, m.tbl, m.module);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.staff_can(%L, true)) WITH CHECK (public.staff_can(%L, true))', 'staff_edit_'||m.module, m.tbl, m.module, m.module);
  END LOOP;
END $$;