import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EMAIL_ALREADY_REGISTERED, normalizeEmail } from "./registration";

// Return no account details; the same check covers every registration screen.
export const checkRegistrationEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists, error } = await supabaseAdmin.rpc("account_email_exists", {
      _email: normalizeEmail(data.email),
    });
    if (error) throw new Error("Não foi possível verificar o e-mail. Tente novamente.");
    if (exists) throw new Error(EMAIL_ALREADY_REGISTERED);
    return { ok: true };
  });