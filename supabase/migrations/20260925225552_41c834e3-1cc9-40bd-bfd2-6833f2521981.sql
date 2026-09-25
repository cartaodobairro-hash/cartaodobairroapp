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
  v_seller_id uuid;
  v_lead_id uuid;
  v_plan_id uuid;
  v_customer_id uuid;
  v_token uuid;
  v_code text;
  v_cpf text;
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
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;

  IF v_role = 'customer'::public.app_role THEN
    v_code := NULLIF(btrim(NEW.raw_user_meta_data->>'seller_code'), '');
    v_cpf := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g');
    BEGIN
      v_token := NULLIF(btrim(NEW.raw_user_meta_data->>'proposal_token'), '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_token := NULL;
    END;

    IF v_token IS NOT NULL THEN
      SELECT l.id, l.seller_id, l.plan_id INTO v_lead_id, v_seller_id, v_plan_id
      FROM public.seller_leads l JOIN public.sellers s ON s.id = l.seller_id
      WHERE l.proposal_token = v_token AND l.status <> 'perdido' AND s.status = 'ativo'
        AND l.customer_id IS NULL
        AND lower(btrim(l.email)) = lower(btrim(NEW.email))
        AND regexp_replace(COALESCE(l.cpf, ''), '\D', '', 'g') = v_cpf
        AND length(v_cpf) = 11
        AND (v_code IS NULL OR lower(s.seller_code) = lower(v_code))
      LIMIT 1;
    ELSIF v_code IS NOT NULL THEN
      SELECT s.id INTO v_seller_id FROM public.sellers s
      WHERE lower(s.seller_code) = lower(v_code) AND s.status = 'ativo' LIMIT 1;
    END IF;

    IF v_seller_id IS NOT NULL THEN
      INSERT INTO public.customers (user_id, seller_id, plan_id, status)
      VALUES (NEW.id, v_seller_id, v_plan_id, 'pendente')
      ON CONFLICT (user_id) DO UPDATE
        SET seller_id = COALESCE(public.customers.seller_id, EXCLUDED.seller_id),
            plan_id = COALESCE(public.customers.plan_id, EXCLUDED.plan_id)
      RETURNING id INTO v_customer_id;
      IF v_lead_id IS NOT NULL THEN
        UPDATE public.seller_leads
        SET customer_id = v_customer_id, status = 'cadastro', last_contact_at = now()
        WHERE id = v_lead_id AND customer_id IS NULL;
      END IF;
    END IF;
  END IF;

  IF v_role = 'partner'::public.app_role THEN
    BEGIN
      v_category_id := NULLIF(NEW.raw_user_meta_data->>'partner_category_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_category_id := NULL;
    END;
    INSERT INTO public.partners (
      user_id, category_id, company_name, trade_name, cnpj, description, phone,
      whatsapp, email, city, neighborhood, street, number, status
    ) VALUES (
      NEW.id, v_category_id,
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
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;