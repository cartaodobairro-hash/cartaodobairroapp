import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getApprovedPartnerLogos } from "@/lib/partner-logo.functions";

export function useApprovedPartnerLogos(paths: (string | null | undefined)[]) {
  const fetchLogos = useServerFn(getApprovedPartnerLogos);
  const clean = [...new Set(paths.filter((path): path is string => !!path))];
  return useQuery({
    queryKey: ["approved-partner-logos", clean.slice().sort().join("|")],
    enabled: clean.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const external = Object.fromEntries(clean.filter((path) => /^https?:\/\//i.test(path)).map((path) => [path, path]));
      const stored = clean.filter((path) => !/^https?:\/\//i.test(path));
      return { ...external, ...(stored.length ? await fetchLogos({ data: stored }) : {}) };
    },
  });
}

export function PartnerLogo({ name, url }: { name: string; url?: string }) {
  if (!url) return null;
  return <img src={url} alt={`Logo de ${name}`} loading="lazy" className="size-11 shrink-0 rounded-md border border-border bg-card object-contain" />;
}