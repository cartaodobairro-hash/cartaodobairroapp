-- Run through the database query tool. All fixture changes roll back inside
-- the exception block; failed assertions escape and fail the test.
DO $$
DECLARE fixture record; usage_id uuid := gen_random_uuid(); customer_notices integer; admin_notices integer; expected_admins integer;
BEGIN
  SELECT cd.id card_id, cd.customer_id, c.user_id, pt.id partner_id INTO fixture
  FROM public.cards cd JOIN public.customers c ON c.id = cd.customer_id
  CROSS JOIN public.partners pt WHERE pt.status = 'aprovado' LIMIT 1;
  IF fixture IS NULL THEN RAISE EXCEPTION 'No attendance fixture available'; END IF;
  BEGIN
    INSERT INTO public.card_usage(id,card_id,customer_id,partner_id,amount_saved,purchase_amount,product_description)
    VALUES(usage_id,fixture.card_id,fixture.customer_id,fixture.partner_id,5,50,'Teste automático de avisos');
    SELECT count(*) INTO customer_notices FROM public.notifications
    WHERE card_usage_id = usage_id AND user_id = fixture.user_id AND type = 'avaliacao';
    IF customer_notices <> 1 THEN RAISE EXCEPTION 'Expected exactly one customer notification, got %',customer_notices; END IF;
    SELECT count(DISTINCT r.user_id) INTO expected_admins FROM public.user_roles r JOIN public.profiles p ON p.id=r.user_id
    WHERE public.is_admin(r.user_id) AND p.status='ativo';
    IF expected_admins = 0 THEN RAISE EXCEPTION 'No administrator fixture available'; END IF;
    SELECT count(*) INTO admin_notices FROM public.notifications WHERE card_usage_id=usage_id AND type='atendimento';
    IF admin_notices <> expected_admins THEN RAISE EXCEPTION 'Expected % administrator notifications, got %',expected_admins,admin_notices; END IF;
    IF EXISTS(SELECT 1 FROM public.notifications WHERE card_usage_id=usage_id AND type='atendimento' AND NOT public.is_admin(user_id)) THEN
      RAISE EXCEPTION 'Attendance notification sent to non-administrator';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE card_usage_id=usage_id AND type='avaliacao' AND partner_id=fixture.partner_id AND message LIKE '%5,00%') THEN
      RAISE EXCEPTION 'Customer notification missing attendance details';
    END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Rollback successful notification fixture';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.card_usage WHERE id=usage_id) OR EXISTS(SELECT 1 FROM public.notifications WHERE card_usage_id=usage_id) THEN
    RAISE EXCEPTION 'Test fixture was not rolled back';
  END IF;
END; $$;