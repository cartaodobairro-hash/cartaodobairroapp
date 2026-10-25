ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS card_usage_id uuid REFERENCES public.card_usage(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS card_usage_id uuid REFERENCES public.card_usage(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_attendance ON public.reviews(card_usage_id) WHERE card_usage_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_review_per_attendance ON public.notifications(card_usage_id) WHERE type = 'avaliacao' AND card_usage_id IS NOT NULL;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM authenticated;
CREATE OR REPLACE FUNCTION public.notify_customer_after_attendance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; partner_name text;
BEGIN
 SELECT user_id INTO owner_id FROM public.customers WHERE id = NEW.customer_id;
 SELECT trade_name INTO partner_name FROM public.partners WHERE id = NEW.partner_id;
 IF owner_id IS NOT NULL THEN
  INSERT INTO public.notifications(user_id,title,message,type,partner_id,card_usage_id)
  VALUES(owner_id, 'Avalie seu atendimento', 'Seu cartão foi utilizado em ' || COALESCE(partner_name,'um parceiro') || '. Como foi seu atendimento?', 'avaliacao', NEW.partner_id, NEW.id);
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_customer_after_attendance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_customer_after_attendance AFTER INSERT ON public.card_usage FOR EACH ROW EXECUTE FUNCTION public.notify_customer_after_attendance();
CREATE OR REPLACE FUNCTION public.refresh_partner_review_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
 target := CASE WHEN TG_OP = 'DELETE' THEN OLD.partner_id ELSE NEW.partner_id END;
 PERFORM id FROM public.partners WHERE id = target FOR UPDATE;
 UPDATE public.partners SET rating = COALESCE((SELECT round(avg(rating),2) FROM public.reviews WHERE partner_id = target AND status = 'ativo'),0), reviews_count = (SELECT count(*) FROM public.reviews WHERE partner_id = target AND status = 'ativo') WHERE id = target;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.refresh_partner_review_rating() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER refresh_partner_review_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_partner_review_rating();
CREATE OR REPLACE FUNCTION public.submit_attendance_review(_usage_id uuid, _rating integer, _comment text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE attendance public.card_usage%ROWTYPE; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para avaliar'; END IF;
 IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Escolha uma nota de 1 a 5'; END IF;
 IF length(COALESCE(_comment,'')) > 1000 THEN RAISE EXCEPTION 'O comentário deve ter até 1000 caracteres'; END IF;
 SELECT u.* INTO attendance FROM public.card_usage u JOIN public.customers c ON c.id = u.customer_id WHERE u.id = _usage_id AND c.user_id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Atendimento não encontrado para sua conta'; END IF;
 INSERT INTO public.reviews(user_id,partner_id,card_usage_id,rating,comment,status)
 VALUES(auth.uid(),attendance.partner_id,attendance.id,_rating,NULLIF(btrim(_comment),''),'ativo')
 ON CONFLICT (card_usage_id) WHERE card_usage_id IS NOT NULL DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Este atendimento já foi avaliado'; END IF;
 UPDATE public.notifications SET read_at = COALESCE(read_at,now()) WHERE user_id = auth.uid() AND card_usage_id = attendance.id AND type = 'avaliacao';
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_attendance_review(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_attendance_review(uuid,integer,text) TO authenticated;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; END IF; END $$;