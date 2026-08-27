ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

ALTER TABLE public.dependents ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.dependents ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

UPDATE public.plans SET
  name = 'Individual',
  description = 'Para 1 pessoa. Todos os benefícios do Cartão do Bairro.',
  price = 9.90,
  period = 'mensal',
  max_dependents = 0,
  sort_order = 1,
  rules = 'Plano exclusivamente individual. Não permite cadastro de dependentes.',
  highlights = ARRAY['1 titular','Cartão digital','QR Code para identificação','Acesso a todos os parceiros','Acesso a todos os benefícios e descontos','Consulta de empresas próximas','Localização pelo mapa','Busca por categoria','Promoções e ofertas','Favoritos','Histórico de utilização','Notificações','Aplicativo completo']
WHERE lower(name) LIKE '%individual%';

UPDATE public.plans SET
  name = 'Família',
  description = 'Para você + até 10 dependentes, sem exigência de grau de parentesco.',
  price = 19.90,
  period = 'mensal',
  max_dependents = 10,
  sort_order = 2,
  rules = 'Até 10 dependentes. Não é exigido grau de parentesco nem documento de vínculo familiar. O titular pode adicionar ou remover dependentes enquanto a assinatura estiver ativa.',
  highlights = ARRAY['1 titular','Até 10 dependentes','Sem exigência de grau familiar','Cartão digital do titular','Identificação dos dependentes','QR Code','Acesso a todos os parceiros','Acesso a todos os benefícios e descontos','Consulta de empresas próximas','Localização pelo mapa','Busca por categoria','Promoções e ofertas','Favoritos','Histórico de utilização','Notificações','Aplicativo completo']
WHERE lower(name) LIKE '%fam%';

INSERT INTO public.plans (name, description, price, period, max_dependents, sort_order, rules, highlights)
SELECT 'Individual','Para 1 pessoa. Todos os benefícios do Cartão do Bairro.',9.90,'mensal',0,1,
  'Plano exclusivamente individual. Não permite cadastro de dependentes.',
  ARRAY['1 titular','Cartão digital','QR Code para identificação','Acesso a todos os parceiros','Acesso a todos os benefícios e descontos','Favoritos','Histórico de utilização','Aplicativo completo']
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE lower(name) LIKE '%individual%');

INSERT INTO public.plans (name, description, price, period, max_dependents, sort_order, rules, highlights)
SELECT 'Família','Para você + até 10 dependentes, sem exigência de grau de parentesco.',19.90,'mensal',10,2,
  'Até 10 dependentes. Não é exigido grau de parentesco nem documento de vínculo familiar.',
  ARRAY['1 titular','Até 10 dependentes','Sem exigência de grau familiar','Cartão digital do titular','QR Code','Acesso a todos os parceiros','Favoritos','Histórico de utilização','Aplicativo completo']
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE lower(name) LIKE '%fam%');

CREATE OR REPLACE FUNCTION public.enforce_dependent_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INT;
  v_count INT;
BEGIN
  IF NEW.removed_at IS NOT NULL OR NEW.status <> 'ativo' THEN
    RETURN NEW;
  END IF;

  SELECT p.max_dependents INTO v_max
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.customer_id = NEW.customer_id
  ORDER BY (s.status = 'ativo') DESC, s.created_at DESC
  LIMIT 1;

  IF v_max IS NULL THEN
    SELECT p.max_dependents INTO v_max
    FROM public.customers c JOIN public.plans p ON p.id = c.plan_id
    WHERE c.id = NEW.customer_id;
  END IF;

  v_max := COALESCE(v_max, 0);

  SELECT COUNT(*) INTO v_count
  FROM public.dependents d
  WHERE d.customer_id = NEW.customer_id
    AND d.removed_at IS NULL
    AND d.status = 'ativo'
    AND d.id <> NEW.id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Limite de dependentes do plano atingido (%).', v_max;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_dependents_limit ON public.dependents;
CREATE TRIGGER trg_dependents_limit
BEFORE INSERT OR UPDATE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.enforce_dependent_limit();