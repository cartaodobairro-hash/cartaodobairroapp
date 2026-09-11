CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_role text;
  v_role public.app_role;
  v_category_id uuid;
BEGIN
  v_requested_role := NEW.raw_user_meta_data->>'role';
  v_role := CASE WHEN v_requested_role = 'partner' THEN 'partner'::public.app_role ELSE 'customer'::public.app_role END;

  INSERT INTO public.profiles (id, name, email, phone, cpf)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''), NULLIF(btrim(NEW.raw_user_meta_data->>'trade_name'), ''), ''),
    NEW.email,
    NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'cpf'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'partner'::public.app_role THEN
    BEGIN
      v_category_id := NULLIF(NEW.raw_user_meta_data->>'partner_category_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_category_id := NULL;
    END;

    INSERT INTO public.partners (
      user_id,
      category_id,
      company_name,
      trade_name,
      cnpj,
      description,
      phone,
      whatsapp,
      email,
      city,
      neighborhood,
      street,
      number,
      status
    )
    VALUES (
      NEW.id,
      v_category_id,
      left(COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'partner_company_name'), ''), 'Empresa'), 200),
      left(COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'trade_name'), ''), 'Empresa'), 200),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_cnpj'), 30), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_description'), 2000), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'phone'), 30), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_whatsapp'), 30), ''),
      NEW.email,
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_city'), 120), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_neighborhood'), 120), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_street'), 200), ''),
      NULLIF(left(btrim(NEW.raw_user_meta_data->>'partner_number'), 30), ''),
      'pendente'::public.partner_status
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;