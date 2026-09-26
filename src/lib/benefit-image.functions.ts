import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const pathsSchema = z.array(z.string().min(1).max(512).regex(/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png)$/i)).max(50);

// Public pages can display only images attached to active benefits of approved partners.
export const getActiveBenefitImages = createServerFn({ method: "POST" })
  .inputValidator((paths: string[]) => pathsSchema.parse(paths))
  .handler(async ({ data: paths }) => {
    const requested = [...new Set(paths)];
    if (!requested.length) return {} as Record<string, string>;

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Não foi possível carregar as imagens dos benefícios.");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data: benefits, error } = await client.from("benefits")
      .select("partner_id, image_url, partners!inner(id, status)")
      .eq("status", "ativo")
      .eq("partners.status", "aprovado")
      .in("image_url", requested);
    if (error) throw new Error("Não foi possível carregar as imagens dos benefícios.");

    const allowed = [...new Set((benefits ?? [])
      .filter((benefit) => benefit.image_url?.startsWith(`${benefit.partner_id}/`) && requested.includes(benefit.image_url))
      .map((benefit) => benefit.image_url as string))];
    if (!allowed.length) return {} as Record<string, string>;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: signError } = await supabaseAdmin.storage.from("benefit-images")
      .createSignedUrls(allowed, 60 * 60);
    if (signError) throw new Error("Não foi possível carregar as imagens dos benefícios.");

    return Object.fromEntries((data ?? []).flatMap((item) =>
      item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl]] : [],
    )) as Record<string, string>;
  });