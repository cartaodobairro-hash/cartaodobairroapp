import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const isExternal = (v: string) => /^https?:\/\//i.test(v);

/** Resolve storage paths (or external URLs) into displayable URLs. */
export function useMediaUrls(bucket: string, paths: (string | null | undefined)[]) {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const key = clean.slice().sort().join("|");

  return useQuery({
    queryKey: ["media", bucket, key],
    enabled: clean.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const toSign: string[] = [];
      for (const p of clean) {
        if (isExternal(p)) map[p] = p;
        else toSign.push(p);
      }
      if (toSign.length) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrls(toSign, 60 * 60 * 24);
        if (error) throw error;
        data?.forEach((item, i) => {
          const path = item.path ?? toSign[i];
          if (item.signedUrl) map[path] = item.signedUrl;
        });
      }
      return map;
    },
  });
}

export async function uploadMedia(bucket: string, file: File, prefix = "") {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function removeMedia(bucket: string, path?: string | null) {
  if (!path || isExternal(path)) return;
  await supabase.storage.from(bucket).remove([path]);
}
