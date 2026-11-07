CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_admin_attendance ON public.notifications(user_id, card_usage_id) WHERE type = 'atendimento' AND card_usage_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.notify_customer_after_attendance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; partner_name text; customer_name text; details text;
BEGIN
 SELECT c.user_id, p.name INTO owner_id, customer_name FROM public.customers c LEFT JOIN public.profiles p ON p.id = c.user_id WHERE c.id = NEW.customer_id;
 SELECT trade_name INTO partner_name FROM public.partners WHERE id = NEW.partner_id;
 details := 'Parceiro: ' || COALESCE(partner_name,'Parceiro') || '. Produto/benefício: ' || COALESCE(NULLIF(btrim(NEW.product_description),''),(SELECT title FROM public.benefits WHERE id = NEW.benefit_id),'Não informado') || '. Economia: R$ ' || replace(to_char(NEW.amount_saved,'FM999999990.00'),'.',',') || '.';
 IF owner_id IS NOT NULL THEN
  INSERT INTO public.notifications(user_id,title,message,type,partner_id,card_usage_id)
  VALUES(owner_id,'Uso do cartão confirmado',details || ' Como foi seu atendimento? Avalie o parceiro.','avaliacao',NEW.partner_id,NEW.id);
 END IF;
 INSERT INTO public.notifications(user_id,title,message,type,partner_id,card_usage_id)
 SELECT DISTINCT r.user_id,'Cliente utilizou o cartão',COALESCE(customer_name,'Cliente') || ' realizou um atendimento. ' || details,'atendimento',NEW.partner_id,NEW.id
 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
 WHERE public.is_admin(r.user_id) AND p.status = 'ativo'
 ON CONFLICT (user_id,card_usage_id) WHERE type = 'atendimento' AND card_usage_id IS NOT NULL DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_customer_after_attendance() FROM PUBLIC, anon, authenticated;