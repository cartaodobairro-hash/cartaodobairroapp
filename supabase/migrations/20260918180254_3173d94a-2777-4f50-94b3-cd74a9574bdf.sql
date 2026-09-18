ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_holder text,
  ADD COLUMN IF NOT EXISTS bank_document text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_pix_key text;

ALTER TABLE public.seller_leads
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS sale_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS proposal_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seller_leads_proposal_token_key ON public.seller_leads(proposal_token);
CREATE UNIQUE INDEX IF NOT EXISTS seller_leads_cpf_active_key ON public.seller_leads(regexp_replace(cpf, '\D', '', 'g')) WHERE cpf IS NOT NULL AND status <> 'perdido';
CREATE UNIQUE INDEX IF NOT EXISTS seller_leads_email_active_key ON public.seller_leads(lower(email)) WHERE email IS NOT NULL AND status <> 'perdido';
CREATE UNIQUE INDEX IF NOT EXISTS seller_leads_whatsapp_active_key ON public.seller_leads(regexp_replace(whatsapp, '\D', '', 'g')) WHERE whatsapp IS NOT NULL AND status <> 'perdido';

ALTER TABLE public.seller_sales
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS seller_sales_subscription_key ON public.seller_sales(subscription_id) WHERE subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_seller_commercial_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.seller_code IS DISTINCT FROM OLD.seller_code
      OR NEW.commission_type IS DISTINCT FROM OLD.commission_type
      OR NEW.commission_value IS DISTINCT FROM OLD.commission_value
      OR NEW.goal IS DISTINCT FROM OLD.goal
      OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente administradores podem alterar regras comerciais do vendedor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sellers_protect_rules ON public.sellers;
CREATE TRIGGER trg_sellers_protect_rules
BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.protect_seller_commercial_rules();

CREATE OR REPLACE FUNCTION public.claim_seller_proposal(_proposal_token uuid DEFAULT NULL, _seller_code text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_lead_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;

  IF _proposal_token IS NOT NULL THEN
    SELECT l.id, l.seller_id INTO v_lead_id, v_seller_id
    FROM public.seller_leads l
    JOIN public.sellers s ON s.id = l.seller_id
    WHERE l.proposal_token = _proposal_token AND l.status <> 'perdido' AND s.status = 'ativo'
    LIMIT 1;
  ELSIF NULLIF(btrim(_seller_code), '') IS NOT NULL THEN
    SELECT s.id INTO v_seller_id
    FROM public.sellers s
    WHERE lower(s.seller_code) = lower(btrim(_seller_code)) AND s.status = 'ativo'
    LIMIT 1;
  END IF;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.customers c
  SET seller_id = v_seller_id, updated_at = now()
  WHERE c.user_id = auth.uid() AND (c.seller_id IS NULL OR c.seller_id = v_seller_id);

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.seller_leads
    SET status = 'cadastro', last_contact_at = now()
    WHERE id = v_lead_id;
  END IF;

  RETURN v_seller_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_seller_proposal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_seller_proposal(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_seller_sale_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_seller public.sellers%ROWTYPE;
  v_sale_id uuid;
  v_commission numeric(12,2);
  v_due date;
BEGIN
  IF NEW.status <> 'ativo' OR OLD.status = 'ativo' THEN RETURN NEW; END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = NEW.customer_id;
  IF v_customer.seller_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_seller FROM public.sellers WHERE id = v_customer.seller_id AND status = 'ativo';
  IF v_seller.id IS NULL THEN RETURN NEW; END IF;

  v_commission := CASE
    WHEN v_seller.commission_type = 'fixo' THEN v_seller.commission_value
    ELSE round((NEW.amount * v_seller.commission_value / 100.0)::numeric, 2)
  END;
  v_due := (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '9 days')::date;

  INSERT INTO public.seller_sales (seller_id, customer_id, plan_id, subscription_id, amount, commission_amount, source, status)
  VALUES (v_seller.id, NEW.customer_id, NEW.plan_id, NEW.id, NEW.amount, v_commission, 'indicação', 'pago')
  ON CONFLICT (subscription_id) WHERE subscription_id IS NOT NULL DO UPDATE
    SET amount = EXCLUDED.amount, commission_amount = EXCLUDED.commission_amount, status = 'pago'
  RETURNING id INTO v_sale_id;

  INSERT INTO public.seller_commissions (seller_id, sale_id, amount, percentage, status, due_date)
  VALUES (v_seller.id, v_sale_id, v_commission,
    CASE WHEN v_seller.commission_type = 'percentual' THEN v_seller.commission_value ELSE 0 END,
    'aprovada', v_due)
  ON CONFLICT DO NOTHING;

  UPDATE public.seller_leads
  SET status = 'ativo', customer_id = NEW.customer_id, last_contact_at = now()
  WHERE seller_id = v_seller.id
    AND status <> 'perdido'
    AND (lower(email) = lower((SELECT email FROM public.profiles WHERE id = v_customer.user_id))
      OR regexp_replace(cpf, '\D', '', 'g') = regexp_replace((SELECT cpf FROM public.profiles WHERE id = v_customer.user_id), '\D', '', 'g'));

  UPDATE public.seller_goals
  SET achieved = achieved + 1
  WHERE seller_id = v_seller.id AND status = 'ativo'
    AND CURRENT_DATE >= start_date AND (end_date IS NULL OR CURRENT_DATE <= end_date);

  IF v_seller.user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (v_seller.user_id, 'Pagamento aprovado', 'Uma nova venda foi confirmada e sua comissão foi liberada.', 'seller_sale');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.register_seller_sale_on_activation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_seller_sale_on_activation() TO service_role;

DROP TRIGGER IF EXISTS trg_subscription_seller_sale ON public.subscriptions;
CREATE TRIGGER trg_subscription_seller_sale
AFTER UPDATE OF status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.register_seller_sale_on_activation();

CREATE INDEX IF NOT EXISTS seller_leads_seller_status_created_idx ON public.seller_leads(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_sales_seller_created_idx ON public.seller_sales(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_commissions_seller_created_idx ON public.seller_commissions(seller_id, created_at DESC);