import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shells";

type Search = { q: string; categoria: string };

export const Route = createFileRoute("/_authenticated/app/explorar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
    categoria: typeof s["categoria"] === "string" ? s["categoria"] : "",
  }),
  component: Explore,
});

function Explore() {
  const { q, categoria } = Route.useSearch();
  const navigate = Route.useNavigate();

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

  const { data: partners, isLoading } = useQuery({
    queryKey: ["explore", q, categoria],
    queryFn: async () => {
      let query = supabase
        .from("partners")
        .select("id, trade_name, description, neighborhood, city, rating, sponsored, category_id, categories(name, icon, slug)")
        .eq("status", "aprovado")
        .order("sponsored", { ascending: false })
        .order("rating", { ascending: false })
        .limit(50);
      if (q) query = query.ilike("trade_name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).filter((p) => !categoria || p.categories?.slug === categoria);
    },
  });

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Explorar" description="Encontre benefícios perto de você" />

      <Input
        value={q}
        placeholder="Buscar empresa..."
        onChange={(e) => navigate({ search: { q: e.target.value, categoria } })}
      />

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        <Chip active={!categoria} onClick={() => navigate({ search: { q, categoria: "" } })}>
          Todas
        </Chip>
        {(categories ?? []).map((c) => (
          <Chip
            key={c.id}
            active={categoria === c.slug}
            onClick={() => navigate({ search: { q, categoria: c.slug } })}
          >
            {c.icon} {c.name}
          </Chip>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {(partners ?? []).map((p) => (
          <Link
            key={p.id}
            to="/empresa/$id"
            params={{ id: p.id }}
            className="rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{p.trade_name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.categories?.icon} {p.categories?.name}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold">
                <Star className="size-3 fill-primary text-primary" />
                {Number(p.rating ?? 0).toFixed(1)}
              </span>
            </div>
            {p.description ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
            ) : null}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {[p.neighborhood, p.city].filter(Boolean).join(" • ") || "Endereço em breve"}
            </p>
          </Link>
        ))}
        {!isLoading && !partners?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
