import { createServerFn } from "@tanstack/react-start";
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
