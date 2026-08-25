import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { brl, mapsDirectionsUrl, mapsEmbedUrl, partnerAddress } from "@/lib/format";

export const Route = createFileRoute("/empresa/$id")({
  head: () => ({
    meta: [
      { title: "Empresa parceira — Cartão do Bairro" },
      {
        name: "description",
        content: "Veja benefícios, endereço e contato desta empresa parceira do Cartão do Bairro.",
      },
      { property: "og:title", content: "Empresa parceira — Cartão do Bairro" },
      { property: "og:description", content: "Benefícios exclusivos para associados." },
    ],
  }),
  component: PartnerPage,
});

function PartnerPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*, categories(name, icon), benefits(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: favorite } = useQuery({
    queryKey: ["favorite", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("partner_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function toggleFavorite() {
    if (!user) {
      toast.error("Entre na sua conta para favoritar");
      return;
    }
    if (favorite) {
      await supabase.from("favorites").delete().eq("id", favorite.id);
    } else {
      await supabase.from("favorites").insert({ partner_id: id, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["favorite", id] });
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
  }

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  if (!partner) return <p className="p-6 text-sm text-muted-foreground">Empresa não encontrada.</p>;

  const address = partnerAddress(partner);
  const activeBenefits = (partner.benefits ?? []).filter((b) => b.status === "ativo");

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-background pb-16">
      <div className="flex items-center justify-between p-4">
        <Button asChild size="icon" variant="ghost">
          <Link to="/app/explorar" search={{ q: "", categoria: "" }}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleFavorite}>
          <Heart className={`size-5 ${favorite ? "fill-primary text-primary" : ""}`} />
        </Button>
      </div>

      <header className="px-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{partner.trade_name}</h1>
        <p className="text-sm text-muted-foreground">
          {partner.categories?.icon} {partner.categories?.name}
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="size-4 fill-primary text-primary" />
          {Number(partner.rating ?? 0).toFixed(1)} ({partner.reviews_count} avaliações)
        </p>
        {partner.description ? (
          <p className="mt-3 text-sm text-muted-foreground">{partner.description}</p>
        ) : null}
      </header>

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Benefícios
        </h2>
        <div className="space-y-3">
          {activeBenefits.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{b.title}</p>
                <span className="rounded-full surface-brand px-3 py-1 text-xs font-bold">
                  {b.discount_percentage}% OFF
                </span>
              </div>
              {b.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
              ) : null}
              {b.normal_price ? (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground line-through">{brl(b.normal_price)}</span>{" "}
                  <strong>{brl(b.discount_price)}</strong>
                </p>
              ) : null}
              {b.rules ? <p className="mt-2 text-xs text-muted-foreground">{b.rules}</p> : null}
            </div>
          ))}
          {!activeBenefits.length ? (
            <p className="text-sm text-muted-foreground">Benefícios em cadastro.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Onde fica
        </h2>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" /> {address || "Endereço não informado"}
        </p>
        {address ? (
          <iframe
            title="Mapa da empresa"
            className="mt-3 h-56 w-full rounded-2xl border border-border"
            src={mapsEmbedUrl(address)}
            loading="lazy"
          />
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={mapsDirectionsUrl(partner)} target="_blank" rel="noreferrer">
              Como chegar
            </a>
          </Button>
          {partner.whatsapp ? (
            <Button asChild size="sm">
              <a
                href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Phone className="size-4" /> WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
        {partner.opening_hours ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Horário: {partner.opening_hours}
          </p>
        ) : null}
      </section>
    </div>
  );
}
