CREATE OR REPLACE FUNCTION public.sync_card_with_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expires date;
  v_period text;
  v_card public.cards%ROWTYPE;
  v_token text;
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
      v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
      INSERT INTO public.cards (customer_id, card_number, qr_token, status, issued_at, expires_at)
      VALUES (NEW.customer_id, public.generate_card_number(), v_token, 'ativo', now(), v_expires);
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
END; $function$;