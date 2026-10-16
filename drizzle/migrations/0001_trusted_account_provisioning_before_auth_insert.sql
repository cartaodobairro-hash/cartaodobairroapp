CREATE TABLE public.account_provisioning (
 email text PRIMARY KEY,
 role text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_provisioning TO service_role;
ALTER TABLE public.account_provisioning ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_provisioning IS 'Service-only short-lived account provisioning intent; GoTrue applies app metadata after the auth insert trigger.';
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) INTO definition;
 definition := replace(definition,
  '  v_requested_role := NEW.raw_app_meta_data->>''provisioned_role'';',
  '  -- GoTrue may apply app metadata after INSERT; consume the service-only intent first.
  DELETE FROM public.account_provisioning
  WHERE email = lower(btrim(NEW.email)) AND created_at > now() - interval ''5 minutes''
  RETURNING role INTO v_requested_role;
  v_requested_role := COALESCE(v_requested_role, NEW.raw_app_meta_data->>''provisioned_role'');');
 IF position('DELETE FROM public.account_provisioning' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected provisioning definition'; END IF;
 EXECUTE definition;
END;
$migration$;