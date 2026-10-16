ALTER TABLE public.account_provisioning ADD COLUMN token uuid NOT NULL DEFAULT gen_random_uuid();
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) INTO definition;
 definition := replace(definition,
  '  WHERE email = lower(btrim(NEW.email)) AND created_at > now() - interval ''5 minutes''',
  '  WHERE email = lower(btrim(NEW.email)) AND created_at > now() - interval ''5 minutes''
    AND token::text = NEW.raw_user_meta_data->>''provisioning_token''');
 IF position('token::text' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected provisioning definition'; END IF;
 EXECUTE definition;
END;
$migration$;