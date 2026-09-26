import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pathsSchema = z.array(z.string().min(1).max(512).regex(/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png)$/i)).max(50);

// Sign only logos attached to approved partners; private bucket browsing remains owner-scoped.
export const getApprovedPartnerLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((paths: string[]) => pathsSchema.parse(paths))
  .handler(async ({ data: paths, context }) => {
    const requested = [...new Set(paths)];
    if (!requested.length) return {} as Record<string, string>;

    const { data: partners, error } = await context.supabase
      .from("partners")
      .select("id, logo_url")
      .eq("status", "aprovado")
      .in("logo_url", requested);
    if (error) throw new Error("Não foi possível carregar as logos dos parceiros.");

    const allowed = [...new Set((partners ?? [])
      .filter((partner) => partner.logo_url?.startsWith(`${partner.id}/`) && requested.includes(partner.logo_url))
      .map((partner) => partner.logo_url as string))];
    if (!allowed.length) return {} as Record<string, string>;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: signError } = await supabaseAdmin.storage
      .from("partner-logos")
      .createSignedUrls(allowed, 60 * 60);
    if (signError) throw new Error("Não foi possível carregar as logos dos parceiros.");

    return Object.fromEntries(
      (data ?? []).flatMap((item) =>
        item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl]] : [],
      ),
    ) as Record<string, string>;
  });