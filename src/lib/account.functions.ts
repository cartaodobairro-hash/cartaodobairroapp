import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Identifier = { identifier: string; password: string };

function digits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Login por e-mail, CPF ou telefone.
 * Quando o identificador não é um e-mail, buscamos o e-mail correspondente no
 * cadastro (server-side) e autenticamos normalmente. O e-mail nunca é devolvido
 * ao navegador quando a senha está errada, evitando descoberta de contas.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input: Identifier) => {
    if (!input?.identifier?.trim() || !input?.password) {
      throw new Error("Informe seu acesso e a senha.");
    }
    return { identifier: input.identifier.trim(), password: input.password };
  })
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    let email = data.identifier.includes("@") ? data.identifier.toLowerCase() : "";

    if (!email) {
      const only = digits(data.identifier);
      if (only.length < 10) throw new Error("Informe um e-mail, CPF ou telefone válido.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select("email, cpf, phone, whatsapp")
        .or(`cpf.eq.${only},phone.eq.${only},whatsapp.eq.${only}`)
        .limit(2);
      if (error) throw new Error("Não foi possível validar seu acesso.");
      const match = (rows ?? []).find((r) => r.email);
      if (!match?.email) throw new Error("Não encontramos uma conta com esses dados.");
      email = match.email.toLowerCase();
    }

    const client = createClient<Database>(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (publishable.startsWith("sb_") && headers.get("Authorization") === `Bearer ${publishable}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", publishable);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: session, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !session.session) throw new Error("Acesso ou senha incorretos.");

    return {
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    };
  });

type CreateSellerInput = {
  name: string;
  email: string;
  password?: string;
  sellerCode?: string;
  cpf?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  neighborhood?: string;
  commissionType?: string;
  commissionValue?: number;
  goal?: number;
};

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

/** Cria uma conta de vendedor sem interromper a sessão do administrador. */
export const createSellerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateSellerInput) => {
    if (!input?.name?.trim() || !input.email?.trim()) {
      throw new Error("Informe o nome e o e-mail do vendedor.");
    }
    if (input.password && input.password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "admin", "financeiro"])
      .limit(1)
      .maybeSingle();
    if (roleError || !role) throw new Error("Você não tem permissão para cadastrar vendedores.");

    const email = data.email.trim().toLowerCase();
    const password = data.password?.trim() || `Vnd${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}!`;
    const sellerCode = cleanOptional(data.sellerCode) || `VND-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: data.name.trim(),
        phone: cleanOptional(data.phone),
        cpf: cleanOptional(data.cpf),
        role: "seller",
      },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message || "Não foi possível criar a conta do vendedor.");
    }

    const { error: sellerError } = await supabaseAdmin.from("sellers").insert({
      user_id: created.user.id,
      seller_code: sellerCode,
      name: data.name.trim(),
      cpf: cleanOptional(data.cpf),
      phone: cleanOptional(data.phone),
      whatsapp: cleanOptional(data.whatsapp),
      email,
      city: cleanOptional(data.city),
      neighborhood: cleanOptional(data.neighborhood),
      commission_type: data.commissionType || "percentual",
      commission_value: Number.isFinite(data.commissionValue) ? data.commissionValue : 10,
      goal: Number.isFinite(data.goal) ? data.goal : 50,
      status: "ativo",
    });

    if (sellerError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(sellerError.message || "Não foi possível salvar o cadastro do vendedor.");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "seller",
    });

    if (roleError) {
      await supabaseAdmin.from("sellers").delete().eq("user_id", created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(roleError.message || "Não foi possível liberar o acesso do vendedor.");
    }

    return { email, password, sellerCode };
  });
