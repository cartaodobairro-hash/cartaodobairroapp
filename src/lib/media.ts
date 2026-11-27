import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizeImageFile, type ImagePreset } from "@/lib/image-optimization";

const isExternal = (v: string) => /^https?:\/\//i.test(v);
const SIGNED_URL_SECONDS = 60 * 60 * 24;
const MEDIA_STALE_TIME = 1000 * 60 * 60 * 23;
const IMMUTABLE_CACHE_SECONDS = "31536000";

/** Resolve storage paths (or external URLs) into displayable URLs. */
export function useMediaUrls(bucket: string, paths: (string | null | undefined)[]) {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const key = clean.slice().sort().join("|");

  return useQuery({
    queryKey: ["media", bucket, key],
    enabled: clean.length > 0,
    staleTime: MEDIA_STALE_TIME,
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
          .createSignedUrls(toSign, SIGNED_URL_SECONDS);
        if (error) throw error;
        data?.forEach((item, i) => {
          const path = item.path ?? toSign[i];
          if (path && item.signedUrl) map[path] = item.signedUrl;
        });
      }
      return map;
    },
  });
}

export async function uploadMedia(
  bucket: string,
  file: File,
  prefix = "",
  imagePreset: ImagePreset = "banner",
) {
  const uploadFile = await optimizeImageFile(file, imagePreset);
  const ext = uploadFile.name.split(".").pop()?.toLowerCase() ?? "bin";
  // Every upload gets a new URL, so browsers can safely cache it for one year.
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadFile, {
      cacheControl: IMMUTABLE_CACHE_SECONDS,
      upsert: false,
      contentType: uploadFile.type,
    });
  if (error) throw error;
  return path;
}

export async function removeMedia(bucket: string, path?: string | null) {
  if (!path || isExternal(path)) return;
  await supabase.storage.from(bucket).remove([path]);
}
