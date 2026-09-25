import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { CreditCard, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, useProfile } from "@/lib/auth";
import { BrandLogo } from "@/components/brand";
import { brl, dateBR, firstOf } from "@/lib/format";
import { useRealtimeCard } from "@/lib/realtime";
import { getActiveBannerMedia } from "@/lib/banner-media.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ClientHome,
});

function ClientHome() {
  const bannerCarouselRef = useRef<HTMLDivElement>(null);
  const bannerIndexRef = useRef(0);
  const { data: profile } = useProfile();
  const { data: customer } = useCustomer();

  useRealtimeCard(customer?.id);

  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("status", "ativo")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const fetchBannerMedia = useServerFn(getActiveBannerMedia);
  const mediaPaths = (banners ?? []).map((b) => b.image_url).filter((path): path is string => !!path);
  const { data: bannerMedia } = useQuery({
    queryKey: ["active-banner-media", mediaPaths.slice().sort().join("|")],
    enabled: mediaPaths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const external = Object.fromEntries(mediaPaths.filter((path) => /^https?:\/\//i.test(path)).map((path) => [path, path]));
      return { ...external, ...await fetchBannerMedia({ data: mediaPaths.filter((path) => !/^https?:\/\//i.test(path)) }) };
    },
  });

  useEffect(() => {
    if (!banners?.length || banners.length < 2) {
      return;
    }

    const carousel = bannerCarouselRef.current;
    if (!carousel) {
      return;
    }

    bannerIndexRef.current = 0;
    carousel.scrollTo({ left: 0 });

    const interval = window.setInterval(() => {
      const nextIndex = (bannerIndexRef.current + 1) % carousel.children.length;
      const nextBanner = carousel.children[nextIndex] as HTMLElement | undefined;

      if (!nextBanner) {
        return;
      }

      bannerIndexRef.current = nextIndex;
      carousel.scrollTo({ left: nextBanner.offsetLeft, behavior: "smooth" });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [banners?.length]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("status", "ativo")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: highlights } = useQuery({
    queryKey: ["highlight-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, trade_name, neighborhood, city, rating, sponsored, categories(name, icon)")
        .eq("status", "aprovado")
        .order("sponsored", { ascending: false })
        .order("rating", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const card = firstOf(customer?.cards);
  const firstName = profile?.name?.split(" ")[0] ?? "associado";

  return (
    <div className="space-y-6 px-4 pt-5">
      <div className="flex items-center justify-between">
        <BrandLogo />
        <span className="text-xs text-muted-foreground">Olá, {firstName}</span>
      </div>

      <Link to="/app/cartao" className="block">
        <div className="surface-ink flex items-center justify-between rounded-2xl p-5 shadow-card">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Meu cartão
            </p>
            <p className="mt-1 text-lg font-extrabold tracking-tight">
              {card?.card_number ?? "Cartão em emissão"}
            </p>
            <p className="text-xs opacity-70">
              {card?.status === "ativo"
                ? `Válido até ${dateBR(card.expires_at)}`
                : "Ative sua assinatura para liberar os benefícios"}
            </p>
          </div>
          <CreditCard className="size-9 text-primary" />
        </div>
      </Link>

      {banners?.length ? (
        <div
          ref={bannerCarouselRef}
          aria-label="Banners em destaque"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4"
        >
          {banners.map((b) => {
            const url = b.image_url ? bannerMedia?.[b.image_url] : undefined;
            const content = (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {url ? (
                  b.media_type === "video" ? (
                    <video
                      src={url}
                      className="aspect-[2/1] w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={url}
                      alt={b.title}
                      loading="lazy"
                      className="aspect-[2/1] w-full object-cover"
                    />
                  )
                ) : null}
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {b.type}
                  </p>
                  <p className="mt-1 font-bold">{b.title}</p>
                  {b.subtitle ? (
                    <p className="text-xs text-muted-foreground">{b.subtitle}</p>
                  ) : null}
                </div>
              </div>
            );
            return (
              <div key={b.id} className="min-w-[80%] max-w-[420px] snap-start">
                {b.link ? (
                  <a href={b.link} target="_blank" rel="noreferrer" className="block">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Categorias
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/app/explorar"
              search={{ categoria: c.slug, q: "" }}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center shadow-card"
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[11px] font-medium leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Destaques perto de você
          </h2>
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/explorar" search={{ categoria: "", q: "" }}>
              Ver todos
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(highlights ?? []).map((p) => (
            <Link
              key={p.id}
              to="/empresa/$id"
              params={{ id: p.id }}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">{p.trade_name}</p>
                {p.sponsored ? <Sparkles className="size-4 text-primary" /> : null}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {[p.neighborhood, p.city].filter(Boolean).join(" • ") || "Endereço em breve"}
              </p>
            </Link>
          ))}
          {!highlights?.length ? (
            <p className="text-sm text-muted-foreground">
              Novas empresas parceiras chegando ao seu bairro.
            </p>
          ) : null}
        </div>
      </section>

      {customer?.plans ? (
        <p className="pb-2 text-center text-xs text-muted-foreground">
          Plano {customer.plans.name} • {brl(customer.plans.price)}/{customer.plans.period}
        </p>
      ) : null}
    </div>
  );
}
