CREATE OR REPLACE FUNCTION public.account_phone_exists(_phone text, _exclude_user uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT length(regexp_replace(coalesce(_phone,''),'\D','','g')) >= 10 AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE right(regexp_replace(coalesce(p.phone,''),'\D','','g'), 11) = right(regexp_replace(_phone,'\D','','g'), 11)
      AND (_exclude_user IS NULL OR p.id <> _exclude_user));
$$;
REVOKE EXECUTE ON FUNCTION public.account_phone_exists(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_phone_exists(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_profile_identity_email()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cpf text; v_phone text;
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
  v_phone := right(regexp_replace(coalesce(NEW.phone,''),'\D','','g'), 11);
  IF length(v_phone) >= 10 AND (TG_OP = 'INSERT' OR right(regexp_replace(coalesce(OLD.phone,''),'\D','','g'), 11) <> v_phone) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('phone:' || v_phone, 0));
    IF public.account_phone_exists(v_phone, NEW.id) THEN
      RAISE EXCEPTION 'Este telefone já está cadastrado.' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;