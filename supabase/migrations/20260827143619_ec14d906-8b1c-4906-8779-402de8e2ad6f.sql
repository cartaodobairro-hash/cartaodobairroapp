
-- gera número de cartão único
CREATE OR REPLACE FUNCTION public.generate_card_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  exists_already boolean;
BEGIN
  LOOP
    candidate := '5000 ' ||
      lpad((floor(random()*10000))::int::text, 4, '0') || ' ' ||
      lpad((floor(random()*10000))::int::text, 4, '0') || ' ' ||
      lpad((floor(random()*10000))::int::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.cards WHERE card_number = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END; $$;

-- emite/atualiza o cartão conforme o status da assinatura
CREATE OR REPLACE FUNCTION public.sync_card_with_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires date;
  v_period text;
  v_card public.cards%ROWTYPE;
BEGIN
  SELECT p.period INTO v_period FROM public.plans p WHERE p.id = NEW.plan_id;
  v_expires := COALESCE(
    NEW.next_due_date,
    CASE WHEN v_period = 'anual' THEN (CURRENT_DATE + INTERVAL '1 year')::date
         ELSE (CURRENT_DATE + INTERVAL '1 month')::date END
  );

  SELECT * INTO v_card FROM public.cards WHERE customer_id = NEW.customer_id ORDER BY created_at DESC LIMIT 1;

  IF NEW.status = 'ativo' THEN
    IF v_card.id IS NULL THEN
      INSERT INTO public.cards (customer_id, card_number, qr_token, status, issued_at, expires_at)
      VALUES (NEW.customer_id, public.generate_card_number(), encode(gen_random_bytes(16), 'hex'), 'ativo', now(), v_expires);
    ELSE
      UPDATE public.cards
        SET status = 'ativo', expires_at = v_expires
        WHERE id = v_card.id;
    END IF;
  ELSE
    IF v_card.id IS NOT NULL AND v_card.status <> 'bloqueado' THEN
      UPDATE public.cards SET status = 'bloqueado' WHERE id = v_card.id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_subscriptions_card ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_card
AFTER INSERT OR UPDATE OF status, next_due_date, plan_id ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_card_with_subscription();

-- realtime
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.dependents REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cards; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dependents; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

REVOKE ALL ON FUNCTION public.generate_card_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_card_with_subscription() FROM PUBLIC, anon, authenticated;
