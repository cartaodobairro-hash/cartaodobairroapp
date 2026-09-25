import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pathsSchema = z.array(z.string().min(1).max(512)).max(50);

// Customers may only receive signed links for media used by currently active banners.
export const getActiveBannerMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((paths: string[]) => pathsSchema.parse(paths))
  .handler(async ({ data: paths, context }) => {
    const requested = [...new Set(paths.filter((path) => !/^https?:\/\//i.test(path)))];
    if (!requested.length) return {} as Record<string, string>;

    const { data: banners, error } = await context.supabase
      .from("banners")
      .select("image_url")
      .eq("status", "ativo")
      .in("image_url", requested);
    if (error) throw new Error("Não foi possível carregar as imagens dos banners.");

    const allowed = [...new Set((banners ?? []).map((banner) => banner.image_url).filter((path): path is string => !!path))];
    if (!allowed.length) return {} as Record<string, string>;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: signError } = await supabaseAdmin.storage
      .from("banners")
      .createSignedUrls(allowed, 60 * 60);
    if (signError) throw new Error("Não foi possível carregar as imagens dos banners.");

    return Object.fromEntries(
      (data ?? []).flatMap((item, index) =>
        item.signedUrl && !item.error ? [[item.path ?? allowed[index], item.signedUrl]] : [],
      ),
    ) as Record<string, string>;
  });