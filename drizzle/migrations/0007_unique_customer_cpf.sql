CREATE OR REPLACE FUNCTION public.account_cpf_exists(_cpf text, _exclude_user uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT length(regexp_replace(coalesce(_cpf,''),'\D','','g')) = 11 AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE regexp_replace(coalesce(p.cpf,''),'\D','','g') = regexp_replace(_cpf,'\D','','g')
      AND (_exclude_user IS NULL OR p.id <> _exclude_user));
$$;
REVOKE EXECUTE ON FUNCTION public.account_cpf_exists(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_cpf_exists(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_profile_identity_email()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cpf text;
BEGIN
  NEW.email := nullif(lower(btrim(NEW.email)), '');
  IF NEW.email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.email, 0));
    IF public.account_email_exists(NEW.email, NEW.id) THEN
      RAISE EXCEPTION 'Este e-mail já está cadastrado.' USING ERRCODE = '23505';
    END IF;
  END IF;
  v_cpf := regexp_replace(coalesce(NEW.cpf,''),'\D','','g');
  IF length(v_cpf) = 11 AND (TG_OP = 'INSERT' OR regexp_replace(coalesce(OLD.cpf,''),'\D','','g') <> v_cpf) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('cpf:' || v_cpf, 0));
    IF public.account_cpf_exists(v_cpf, NEW.id) THEN
      RAISE EXCEPTION 'Este CPF já está cadastrado.' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;