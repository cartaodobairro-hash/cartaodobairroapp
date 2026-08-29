REVOKE ALL ON FUNCTION public.sync_card_with_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_dependent_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_card_number() FROM PUBLIC, anon, authenticated;