CREATE OR REPLACE FUNCTION public.account_email_exists(_email text, _exclude_user uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE lower(btrim(u.email)) = lower(btrim(_email)) AND (_exclude_user IS NULL OR u.id <> _exclude_user))
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE lower(btrim(p.email)) = lower(btrim(_email)) AND (_exclude_user IS NULL OR p.id <> _exclude_user));
$$;
REVOKE ALL ON FUNCTION public.account_email_exists(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_email_exists(text, uuid) TO service_role;

CREATE UNIQUE INDEX profiles_canonical_email_unique ON public.profiles (lower(btrim(email))) WHERE nullif(btrim(email), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_profile_identity_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.email := nullif(lower(btrim(NEW.email)), '');
  IF NEW.email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.email, 0));
    IF public.account_email_exists(NEW.email, NEW.id) THEN
      RAISE EXCEPTION 'Este e-mail já está cadastrado.' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_profile_identity_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_profile_identity_email BEFORE INSERT OR UPDATE OF email ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_identity_email();

DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) INTO definition;
  definition := replace(definition,
    '  v_requested_role := NEW.raw_user_meta_data->>''role'';
  v_role := CASE WHEN v_requested_role = ''partner'' THEN ''partner''::public.app_role ELSE ''customer''::public.app_role END;',
    '  -- Privileged roles can only originate from trusted administrator provisioning.
  v_requested_role := NEW.raw_app_meta_data->>''provisioned_role'';
  IF v_requested_role IN (''seller'', ''super_admin'', ''admin'', ''financeiro'', ''employee'') THEN
    v_role := v_requested_role::public.app_role;
  ELSIF v_requested_role = ''staff'' THEN
    v_role := NULL;
  ELSE
    v_role := CASE WHEN NEW.raw_user_meta_data->>''role'' = ''partner'' THEN ''partner''::public.app_role ELSE ''customer''::public.app_role END;
  END IF;
  IF NEW.email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(NEW.email)), 0));
    IF public.account_email_exists(NEW.email, NEW.id) THEN
      RAISE EXCEPTION ''Este e-mail já está cadastrado.'' USING ERRCODE = ''23505'';
    END IF;
  END IF;');
  definition := replace(definition,
    '  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;',
    '  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  END IF;');
  IF position('raw_app_meta_data' IN definition) = 0 OR position('IF v_role IS NOT NULL' IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected handle_new_user definition';
  END IF;
  EXECUTE definition;
END;
$migration$;
