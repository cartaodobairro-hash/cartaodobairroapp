CREATE TYPE public.cash_flow_type AS ENUM ('receita', 'despesa');
CREATE TYPE public.cash_flow_status AS ENUM ('previsto', 'pago', 'cancelado');
CREATE TYPE public.cash_flow_recurrence AS ENUM ('nenhuma', 'mensal', 'trimestral', 'semestral', 'anual');

CREATE TABLE public.cash_flow_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.cash_flow_type NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_categories TO authenticated;
GRANT ALL ON public.cash_flow_categories TO service_role;
ALTER TABLE public.cash_flow_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_flow_categories_admin_all" ON public.cash_flow_categories
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_cash_flow_categories_updated
  BEFORE UPDATE ON public.cash_flow_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.cash_flow_type NOT NULL,
  category_id UUID REFERENCES public.cash_flow_categories(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  counterparty TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  expected_date DATE,
  competence_date DATE NOT NULL,
  settled_at TIMESTAMPTZ,
  payment_method TEXT,
  status public.cash_flow_status NOT NULL DEFAULT 'previsto',
  recurrence public.cash_flow_recurrence NOT NULL DEFAULT 'nenhuma',
  recurrence_end DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recurrence = 'nenhuma' OR recurrence_end IS NULL OR recurrence_end >= due_date),
  CHECK (status <> 'pago' OR settled_at IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_entries TO authenticated;
GRANT ALL ON public.cash_flow_entries TO service_role;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_flow_entries_admin_all" ON public.cash_flow_entries
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX cash_flow_entries_due_date_idx ON public.cash_flow_entries (due_date);
CREATE INDEX cash_flow_entries_competence_date_idx ON public.cash_flow_entries (competence_date);
CREATE INDEX cash_flow_entries_status_type_idx ON public.cash_flow_entries (status, type);
CREATE TRIGGER trg_cash_flow_entries_updated
  BEFORE UPDATE ON public.cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_flow_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_month DATE NOT NULL UNIQUE CHECK (reference_month = date_trunc('month', reference_month)::date),
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_balances TO authenticated;
GRANT ALL ON public.cash_flow_balances TO service_role;
ALTER TABLE public.cash_flow_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_flow_balances_admin_all" ON public.cash_flow_balances
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_cash_flow_balances_updated
  BEFORE UPDATE ON public.cash_flow_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();