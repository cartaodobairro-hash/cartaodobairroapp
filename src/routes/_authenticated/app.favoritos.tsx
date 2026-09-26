import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Heart, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { PartnerLogo, useApprovedPartnerLogos } from "@/components/partner-logo";

export const Route = createFileRoute("/_authenticated/app/favoritos")({
  head: () => ({ meta: [
    { title: "Favoritos — Cartão do Bairro" },
    { name: "description", content: "Veja as empresas parceiras que você salvou." },
    { property: "og:title", content: "Favoritos — Cartão do Bairro" },
    { property: "og:description", content: "Veja as empresas parceiras que você salvou." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Favorites,
});

function Favorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, partner_id, partners(id, trade_name, logo_url, neighborhood, city, categories(name, icon))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });
  const { data: logoUrls } = useApprovedPartnerLogos((favorites ?? []).map((f) => f.partners?.logo_url));

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido dos favoritos");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Favoritos" description="Suas empresas salvas" />
      <div className="grid gap-3 sm:grid-cols-2">
        {(favorites ?? []).map((f) => (
          <div key={f.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between">
              <Link to="/empresa/$id" params={{ id: f.partner_id }} className="flex min-w-0 items-start gap-3">
                <PartnerLogo name={f.partners?.trade_name ?? "empresa"} url={f.partners?.logo_url ? logoUrls?.[f.partners.logo_url] : undefined} />
                <div className="min-w-0">
                <p className="font-bold">{f.partners?.trade_name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.partners?.categories?.icon} {f.partners?.categories?.name}
                </p>
                </div>
              </Link>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(f.id)}>
                <Heart className="size-4 fill-primary text-primary" />
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {[f.partners?.neighborhood, f.partners?.city].filter(Boolean).join(" • ")}
            </p>
          </div>
        ))}
        {!favorites?.length ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não salvou nenhuma empresa. Toque no coração na página do parceiro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
