import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePercent,
  MapPin,
  QrCode,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand";
import { brl } from "@/lib/format";
import logo from "@/assets/cartao-bairro-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cartão do Bairro — Desconto de verdade, perto de você" },
      {
        name: "description",
        content:
          "Assine o Cartão do Bairro e economize em saúde, farmácias, mercados, academias e serviços do seu bairro. Cartão digital com QR Code para toda a família.",
      },
      { property: "og:title", content: "Cartão do Bairro — Desconto de verdade, perto de você" },
      {
        property: "og:description",
        content: "Benefícios e descontos reais em empresas parceiras do seu bairro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: plans } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("status", "ativo").order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const [partners, benefits, categories] = await Promise.all([
        supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
        supabase.from("benefits").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);
      return {
        partners: partners.count ?? 0,
        benefits: benefits.count ?? 0,
        categories: categories.count ?? 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/planos">Planos</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ modo: "cadastro" }}>
              Criar conta
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
            <BadgePercent className="size-3.5" /> Benefícios do seu bairro
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Desconto de verdade.
            <span className="block text-primary">Perto de você.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground">
            O Cartão do Bairro conecta moradores e empresas locais. Encontre parceiros próximos,
            apresente seu cartão digital e economize em saúde, alimentação, beleza, serviços e muito
            mais — com toda a família inclusa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Quero meu cartão <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/parceria">Sou uma empresa</Link>
            </Button>
          </div>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center">
            <MiniStat value={stats?.partners ?? 0} label="parceiros" />
            <MiniStat value={stats?.benefits ?? 0} label="benefícios" />
            <MiniStat value={stats?.categories ?? 0} label="categorias" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/15 blur-3xl" aria-hidden />
          <img
            src={logo.url}
            alt="Cartão do Bairro — desconto de verdade, perto de você"
            className="relative w-full rounded-3xl shadow-float"
          />
        </div>
      </section>

      <section className="border-y border-border bg-card py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 md:grid-cols-4">
          <Feature icon={<Users className="size-5" />} title="Família inclusa">
            Cadastre dependentes e todos usam os mesmos benefícios.
          </Feature>
          <Feature icon={<MapPin className="size-5" />} title="Empresas próximas">
            Veja parceiros no mapa, distância, horário e rota até a porta.
          </Feature>
          <Feature icon={<QrCode className="size-5" />} title="Cartão digital">
            Apresente o QR Code, o parceiro valida e o desconto sai na hora.
          </Feature>
          <Feature icon={<ShieldCheck className="size-5" />} title="Seguro e transparente">
            Histórico de uso, pagamentos e avaliações sempre à mão.
          </Feature>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Escolha seu plano</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sem carência. Cancele quando quiser.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-5 md:grid-cols-2">
          {(plans ?? []).map((plan, index) => (
            <div
              key={plan.id}
              className={
                index === 1
                  ? "rounded-2xl surface-ink p-6 shadow-float"
                  : "rounded-2xl border border-border bg-card p-6 shadow-card"
              }
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{plan.name}</p>
              <p className="mt-2 text-3xl font-extrabold">
                {brl(plan.price)}
                <span className="text-sm font-medium opacity-70">/{plan.period}</span>
              </p>
              <p className="mt-2 text-sm opacity-80">{plan.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="text-primary">✓</span> {h}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full" variant={index === 1 ? "default" : "outline"}>
                <Link to="/auth" search={{ modo: "cadastro" }}>
                  Assinar {plan.name}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-ink py-10 text-ink-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-4">
          <BrandLogo onDark />
          <nav className="flex flex-wrap gap-4 text-sm opacity-80">
            <Link to="/parceria" className="hover:text-primary">
              <Store className="mr-1 inline size-4" />
              Seja parceiro
            </Link>
            <Link to="/termos" className="hover:text-primary">
              Termos de uso
            </Link>
            <Link to="/privacidade" className="hover:text-primary">
              Privacidade
            </Link>
            <Link to="/auth" className="hover:text-primary">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xl font-extrabold text-primary">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </span>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
