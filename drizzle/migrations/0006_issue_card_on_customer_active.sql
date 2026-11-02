CREATE OR REPLACE FUNCTION public.issue_card_on_customer_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card public.cards%ROWTYPE;
  v_expires date;
BEGIN
  IF NEW.status <> 'ativo' OR (TG_OP = 'UPDATE' AND OLD.status = 'ativo') THEN
    RETURN NEW;
  END IF;
  SELECT s.next_due_date INTO v_expires FROM public.subscriptions s
   WHERE s.customer_id = NEW.id AND s.status = 'ativo' ORDER BY s.next_due_date DESC NULLS LAST LIMIT 1;
  v_expires := COALESCE(v_expires, (CURRENT_DATE + INTERVAL '1 month')::date);
  SELECT * INTO v_card FROM public.cards WHERE customer_id = NEW.id ORDER BY created_at DESC LIMIT 1;
  IF v_card.id IS NULL THEN
    INSERT INTO public.cards (customer_id, card_number, qr_token, status, issued_at, expires_at)
    VALUES (NEW.id, public.generate_card_number(), encode(gen_random_bytes(16), 'hex'), 'ativo', now(), v_expires);
  ELSE
    UPDATE public.cards SET status = 'ativo', expires_at = GREATEST(COALESCE(expires_at, v_expires), v_expires) WHERE id = v_card.id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.issue_card_on_customer_active() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_customers_issue_card ON public.customers;
CREATE TRIGGER trg_customers_issue_card
AFTER INSERT OR UPDATE OF status ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.issue_card_on_customer_active();