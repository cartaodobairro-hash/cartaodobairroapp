
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','financeiro','partner','employee','seller','customer');
CREATE TYPE public.generic_status AS ENUM ('ativo','pendente','bloqueado','inativo','cancelado');
CREATE TYPE public.partner_status AS ENUM ('pendente','aprovado','reprovado','suspenso');
CREATE TYPE public.card_status AS ENUM ('ativo','pendente','bloqueado','expirado');
CREATE TYPE public.payment_status AS ENUM ('pago','pendente','falhou','estornado','cancelado');
CREATE TYPE public.commission_status AS ENUM ('pendente','aprovada','liberada','paga','cancelada','estornada');
CREATE TYPE public.lead_status AS ENUM ('novo','contato','interessado','cadastro','pagamento','ativo','perdido');

-- HELPERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cpf TEXT,
  birth_date DATE,
  gender TEXT,
  photo_url TEXT,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','financeiro'))
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, cpf)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name',''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🏬',
  sort_order INT NOT NULL DEFAULT 0,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PLANS
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'mensal',
  max_dependents INT NOT NULL DEFAULT 0,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SELLERS
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  photo_url TEXT,
  city TEXT,
  neighborhood TEXT,
  commission_type TEXT NOT NULL DEFAULT 'percentual',
  commission_value NUMERIC(10,2) NOT NULL DEFAULT 10,
  goal INT NOT NULL DEFAULT 50,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sellers_public_read" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "sellers_self_update" ON public.sellers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "sellers_admin_write" ON public.sellers FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "sellers_admin_delete" ON public.sellers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_sellers_updated BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  cep TEXT, state TEXT, city TEXT, neighborhood TEXT, street TEXT, number TEXT, complement TEXT, reference TEXT,
  document_url TEXT, selfie_url TEXT, residence_proof_url TEXT,
  terms_accepted_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  status public.generic_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_own" ON public.customers FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_customer(_customer_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id AND c.user_id = auth.uid())
$$;

-- DEPENDENTS
CREATE TABLE public.dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  relationship TEXT,
  photo_url TEXT,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependents TO authenticated;
GRANT ALL ON public.dependents TO service_role;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dependents_own" ON public.dependents FOR ALL TO authenticated
  USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));

-- CARDS
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  status public.card_status NOT NULL DEFAULT 'pendente',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cards_own_read" ON public.cards FOR SELECT TO authenticated
  USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'partner') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "cards_own_write" ON public.cards FOR INSERT TO authenticated WITH CHECK (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));
CREATE POLICY "cards_admin_update" ON public.cards FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- PARTNERS
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT,
  description TEXT,
  phone TEXT, whatsapp TEXT, email TEXT, instagram TEXT, website TEXT,
  logo_url TEXT, cover_url TEXT,
  cep TEXT, state TEXT, city TEXT, neighborhood TEXT, street TEXT, number TEXT, complement TEXT,
  latitude NUMERIC(10,7), longitude NUMERIC(10,7),
  opening_hours TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  sponsored BOOLEAN NOT NULL DEFAULT false,
  status public.partner_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_public_read" ON public.partners FOR SELECT USING (status = 'aprovado');
CREATE POLICY "partners_owner_read" ON public.partners FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "partners_insert" ON public.partners FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'seller'));
CREATE POLICY "partners_owner_update" ON public.partners FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "partners_admin_delete" ON public.partners FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_partner(_partner_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.partners p WHERE p.id = _partner_id AND p.user_id = auth.uid())
$$;

-- BENEFITS
CREATE TABLE public.benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  normal_price NUMERIC(10,2),
  discount_price NUMERIC(10,2),
  discount_percentage INT NOT NULL DEFAULT 0,
  rules TEXT,
  requires_scheduling BOOLEAN NOT NULL DEFAULT false,
  usage_limit INT,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benefits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benefits_public_read" ON public.benefits FOR SELECT USING (status = 'ativo');
CREATE POLICY "benefits_owner_all" ON public.benefits FOR ALL TO authenticated
  USING (public.owns_partner(partner_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_partner(partner_id) OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_benefits_updated BEFORE UPDATE ON public.benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EMPLOYEES
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL, cpf TEXT, email TEXT, phone TEXT, role TEXT,
  can_validate BOOLEAN NOT NULL DEFAULT true,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  can_manage_benefits BOOLEAN NOT NULL DEFAULT false,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_owner_all" ON public.employees FOR ALL TO authenticated
  USING (public.owns_partner(partner_id) OR user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_partner(partner_id) OR public.is_admin(auth.uid()));

-- SUBSCRIPTIONS / PAYMENTS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.generic_status NOT NULL DEFAULT 'pendente',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON public.subscriptions FOR ALL TO authenticated
  USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'pix',
  transaction_id TEXT,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own" ON public.payments FOR ALL TO authenticated
  USING (public.owns_customer(customer_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_customer(customer_id) OR public.is_admin(auth.uid()));

-- CARD USAGE
CREATE TABLE public.card_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  benefit_id UUID REFERENCES public.benefits(id) ON DELETE SET NULL,
  dependent_id UUID REFERENCES public.dependents(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  amount_saved NUMERIC(10,2) NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.card_usage TO authenticated;
GRANT ALL ON public.card_usage TO service_role;
ALTER TABLE public.card_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_read" ON public.card_usage FOR SELECT TO authenticated
  USING (public.owns_customer(customer_id) OR public.owns_partner(partner_id) OR public.is_admin(auth.uid()));
CREATE POLICY "usage_insert" ON public.card_usage FOR INSERT TO authenticated
  WITH CHECK (public.owns_partner(partner_id) OR public.is_admin(auth.uid()));

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (status = 'ativo');
CREATE POLICY "reviews_own" ON public.reviews FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- BANNERS
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link TEXT,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'banner',
  city TEXT,
  start_date DATE,
  end_date DATE,
  sort_order INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  status public.generic_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners_public_read" ON public.banners FOR SELECT USING (status = 'ativo');
CREATE POLICY "banners_admin_write" ON public.banners FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'aviso',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- SELLER CRM
CREATE TABLE public.seller_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT, whatsapp TEXT, email TEXT,
  neighborhood TEXT, city TEXT, source TEXT DEFAULT 'manual',
  status public.lead_status NOT NULL DEFAULT 'novo',
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'link',
  status public.payment_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.seller_sales(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  status public.commission_status NOT NULL DEFAULT 'pendente',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'clientes',
  target INT NOT NULL DEFAULT 0,
  achieved INT NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status public.generic_status NOT NULL DEFAULT 'ativo'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_leads, public.seller_sales, public.seller_commissions, public.seller_goals TO authenticated;
GRANT ALL ON public.seller_leads, public.seller_sales, public.seller_commissions, public.seller_goals TO service_role;
ALTER TABLE public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_seller(_seller_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = _seller_id AND s.user_id = auth.uid())
$$;

CREATE POLICY "leads_own" ON public.seller_leads FOR ALL TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid())) WITH CHECK (public.owns_seller(seller_id) OR public.is_admin(auth.uid()));
CREATE POLICY "sales_own" ON public.seller_sales FOR ALL TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid())) WITH CHECK (public.owns_seller(seller_id) OR public.is_admin(auth.uid()));
CREATE POLICY "commissions_own" ON public.seller_commissions FOR ALL TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "goals_own" ON public.seller_goals FOR ALL TO authenticated
  USING (public.owns_seller(seller_id) OR public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SUPPORT / SETTINGS / LOGS
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  message TEXT NOT NULL,
  answer TEXT,
  status public.generic_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_own" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- SEED
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
 ('Saúde','saude','🏥',1),('Farmácias','farmacias','💊',2),('Odontologia','odontologia','🦷',3),
 ('Óticas','oticas','👓',4),('Barbearias','barbearias','💈',5),('Pet Shops','pet','🐶',6),
 ('Mercados','mercados','🛒',7),('Alimentação','alimentacao','🍔',8),('Moda','moda','👗',9),
 ('Serviços','servicos','🔧',10),('Tecnologia','tecnologia','💻',11),('Automotivo','automotivo','🚗',12),
 ('Academia','academia','🏋️',13),('Educação','educacao','📚',14),('Beleza','beleza','💄',15),
 ('Casa e Construção','casa','🏠',16);

INSERT INTO public.plans (name, description, price, period, max_dependents, highlights) VALUES
 ('Plano Individual','Benefícios para você em todo o bairro.',29.90,'mensal',0,ARRAY['Cartão digital','Descontos em todos os parceiros','Sem carência']),
 ('Plano Família','Você e até 4 dependentes economizando juntos.',49.90,'mensal',4,ARRAY['Até 4 dependentes','Cartão digital para todos','Descontos exclusivos','Suporte prioritário']);

INSERT INTO public.banners (title, subtitle, sort_order) VALUES
 ('Economize no seu bairro','Descontos reais em empresas pertinho de você.',1),
 ('Encontre parceiros próximos','Mais de 16 categorias de serviços no seu bairro.',2),
 ('Benefícios exclusivos','Até 50% de desconto em consultas e exames.',3),
 ('Use seu Cartão do Bairro','Apresente o QR Code e economize na hora.',4);

INSERT INTO public.partners (company_name, trade_name, cnpj, category_id, description, phone, whatsapp, city, state, neighborhood, street, number, latitude, longitude, opening_hours, rating, reviews_count, status, sponsored)
SELECT * FROM (VALUES
 ('Clínica Vida Ltda','Clínica Vida','12.345.678/0001-01',(SELECT id FROM public.categories WHERE slug='saude'),'Consultas, exames e check-up com preços especiais para associados.','(11) 3333-1010','5511933331010','São Paulo','SP','Centro','Rua das Flores','120',-23.5505,-46.6333,'Seg a Sex 08h-18h | Sáb 08h-12h',4.80,124,'aprovado'::public.partner_status,true),
 ('Drogaria Bairro Novo ME','Farmácia Bairro Novo','12.345.678/0001-02',(SELECT id FROM public.categories WHERE slug='farmacias'),'Medicamentos, perfumaria e testes rápidos com desconto de associado.','(11) 3333-2020','5511933332020','São Paulo','SP','Vila Nova','Av. Brasil','845',-23.5560,-46.6410,'Todos os dias 07h-23h',4.60,98,'aprovado'::public.partner_status,false),
 ('Sorriso Odonto S/S','Sorriso Odonto','12.345.678/0001-03',(SELECT id FROM public.categories WHERE slug='odontologia'),'Clínica odontológica completa: limpeza, clareamento e ortodontia.','(11) 3333-3030','5511933333030','São Paulo','SP','Jardim União','Rua Ipê','52',-23.5450,-46.6280,'Seg a Sex 09h-19h',4.90,76,'aprovado'::public.partner_status,true),
 ('Barbearia do Zé','Barbearia do Zé','12.345.678/0001-04',(SELECT id FROM public.categories WHERE slug='barbearias'),'Corte, barba e cuidados masculinos no coração do bairro.','(11) 3333-4040','5511933334040','São Paulo','SP','Centro','Rua Bandeirantes','9',-23.5490,-46.6350,'Ter a Sáb 09h-20h',4.70,210,'aprovado'::public.partner_status,false),
 ('Mercado Bom Preço','Mercado Bom Preço','12.345.678/0001-05',(SELECT id FROM public.categories WHERE slug='mercados'),'Hortifruti, açougue e mercearia com condições especiais.','(11) 3333-5050','5511933335050','São Paulo','SP','Vila Nova','Rua São João','1500',-23.5600,-46.6450,'Todos os dias 07h-22h',4.30,340,'aprovado'::public.partner_status,false),
 ('Academia Movimente','Academia Movimente','12.345.678/0001-06',(SELECT id FROM public.categories WHERE slug='academia'),'Musculação, funcional e aulas coletivas sem taxa de matrícula.','(11) 3333-6060','5511933336060','São Paulo','SP','Jardim União','Av. Paulista','2200',-23.5630,-46.6540,'Seg a Sex 06h-23h | Sáb 08h-14h',4.50,188,'aprovado'::public.partner_status,false),
 ('Ótica Visão Clara','Ótica Visão Clara','12.345.678/0001-07',(SELECT id FROM public.categories WHERE slug='oticas'),'Óculos de grau, solares e exame de vista gratuito para associados.','(11) 3333-7070','5511933337070','São Paulo','SP','Centro','Rua XV','300',-23.5520,-46.6300,'Seg a Sáb 09h-18h',4.40,64,'aprovado'::public.partner_status,false),
 ('Pet Amigo','Pet Amigo','12.345.678/0001-08',(SELECT id FROM public.categories WHERE slug='pet'),'Banho, tosa, vacinas e consultas veterinárias.','(11) 3333-8080','5511933338080','São Paulo','SP','Vila Nova','Rua dos Pinheiros','77',-23.5580,-46.6390,'Seg a Sáb 08h-19h',4.80,142,'aprovado'::public.partner_status,false)
) AS t;

INSERT INTO public.benefits (partner_id, title, description, normal_price, discount_price, discount_percentage, rules)
SELECT p.id, b.title, b.descr, b.np, b.dp, b.pct, b.rules FROM public.partners p
JOIN (VALUES
 ('Clínica Vida','Consulta médica','Consulta com clínico geral para titular e dependentes.',200.00,100.00,50,'Mediante agendamento. 1 uso por mês.'),
 ('Clínica Vida','Exames laboratoriais','Pacote de exames de rotina.',300.00,180.00,40,'Sujeito a disponibilidade da agenda.'),
 ('Farmácia Bairro Novo','Medicamentos genéricos','Desconto direto no caixa.',100.00,70.00,30,'Não cumulativo com outras promoções.'),
 ('Sorriso Odonto','Limpeza dental','Profilaxia completa.',180.00,79.00,56,'1 uso a cada 6 meses.'),
 ('Sorriso Odonto','Clareamento','Clareamento a laser.',900.00,590.00,34,'Mediante avaliação.'),
 ('Barbearia do Zé','Corte + barba','Combo completo.',70.00,45.00,36,'De terça a quinta.'),
 ('Mercado Bom Preço','Compras acima de R$150','Desconto na compra total.',150.00,135.00,10,'Uma vez por semana.'),
 ('Academia Movimente','Mensalidade','Plano mensal livre.',129.90,79.90,38,'Sem taxa de matrícula.'),
 ('Ótica Visão Clara','Óculos de grau','Armação + lentes.',600.00,360.00,40,'Inclui exame de vista gratuito.'),
 ('Pet Amigo','Banho e tosa','Para cães de pequeno e médio porte.',90.00,55.00,39,'Mediante agendamento.')
) AS b(trade, title, descr, np, dp, pct, rules) ON b.trade = p.trade_name;

INSERT INTO public.app_settings (key, value) VALUES
 ('app_name','Cartão do Bairro'),('support_whatsapp','5511999990000'),('support_email','contato@cartaodobairro.com.br'),
 ('max_dependents','4'),('suspend_after_days','10');
