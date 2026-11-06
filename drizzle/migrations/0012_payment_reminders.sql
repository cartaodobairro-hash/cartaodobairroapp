CREATE OR REPLACE FUNCTION public.send_payment_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_count integer;
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON (s.customer_id) s.customer_id, s.next_due_date, s.amount, c.user_id
    FROM public.subscriptions s JOIN public.customers c ON c.id = s.customer_id
    WHERE s.status IN ('ativo','pendente','bloqueado') AND s.next_due_date IS NOT NULL
    ORDER BY s.customer_id, (s.status = 'ativo') DESC, s.next_due_date DESC
  ), msgs AS (
    SELECT user_id,
      CASE WHEN next_due_date = v_today + 3 THEN 'Sua mensalidade vence em 3 dias'
           WHEN next_due_date = v_today THEN 'Sua mensalidade vence hoje'
           ELSE 'Mensalidade em atraso' END AS title,
      CASE WHEN next_due_date >= v_today
           THEN 'Mensalidade de R$ ' || to_char(amount,'FM999990D00') || ' vence em ' || to_char(next_due_date,'DD/MM/YYYY') || '. Pague pelo app para manter seu cartão ativo.'
           ELSE 'Sua mensalidade venceu em ' || to_char(next_due_date,'DD/MM/YYYY') || ' (' || (v_today - next_due_date) || ' dias). Regularize pelo app para continuar usando seus descontos.' END AS message
    FROM latest
    WHERE next_due_date = v_today + 3 OR next_due_date = v_today
       OR (next_due_date < v_today AND (v_today - next_due_date) % 3 = 0 AND v_today - next_due_date <= 90)
  )
  INSERT INTO public.notifications(user_id, title, message, type)
  SELECT m.user_id, m.title, m.message, 'cobranca' FROM msgs m
  WHERE NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = m.user_id AND n.type = 'cobranca'
    AND (n.created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_today);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.send_payment_reminders() FROM PUBLIC, anon, authenticated;