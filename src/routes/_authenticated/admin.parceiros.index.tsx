import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { brl, dateBR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/shells";
import type { Database } from "@/integrations/supabase/types";

type PartnerStatus = Database["public"]["Enums"]["partner_status"];

export const Route = createFileRoute("/_authenticated/admin/parceiros/")({
  head: () => ({
    meta: [
      { title: "Análise de Parceiros — Cartão do Bairro" },
      { name: "description", content: "Indicadores e gestão dos parceiros do Cartão do Bairro." },
      { property: "og:title", content: "Análise de Parceiros — Cartão do Bairro" },
      { property: "og:description", content: "Indicadores e gestão dos parceiros do Cartão do Bairro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPartners,
});

function AdminPartners() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: partners } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, trade_name, company_name, city, neighborhood, status, created_at, categories(name, icon), card_usage(id, customer_id, purchase_amount, amount_saved, used_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-partner-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "card_usage" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = (partners ?? []).map((partner) => {
    const usage = partner.card_usage ?? [];
    return {
      ...partner,
      attendances: usage.length,
      customers: new Set(usage.map((item) => item.customer_id)).size,
      purchases: usage.reduce((sum, item) => sum + Number(item.purchase_amount ?? 0), 0),
      discounts: usage.reduce((sum, item) => sum + Number(item.amount_saved ?? 0), 0),
    };
  });
  const filtered = rows.filter((partner) =>
    [partner.trade_name, partner.company_name, partner.city, partner.neighborhood]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const totalCustomers = new Set(
    (partners ?? []).flatMap((partner) => (partner.card_usage ?? []).map((item) => item.customer_id)),
  ).size;
  const totalPurchases = rows.reduce((sum, partner) => sum + partner.purchases, 0);
  const totalDiscounts = rows.reduce((sum, partner) => sum + partner.discounts, 0);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PartnerStatus }) => {
      const { error } = await supabase.from("partners").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Parceiros" description="Cadastros, atendimentos, compras e descontos em tempo real" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Parceiros cadastrados" value={rows.length} tone="brand" />
        <StatCard label="Clientes atendidos" value={totalCustomers} />
        <StatCard label="Compras registradas" value={brl(totalPurchases)} />
        <StatCard label="Descontos concedidos" value={brl(totalDiscounts)} tone="ink" />
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar parceiro, cidade ou bairro"
          className="pl-9"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.trade_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.categories?.icon} {p.categories?.name} •{" "}
                {[p.neighborhood, p.city].filter(Boolean).join(" - ")} • {dateBR(p.created_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span><strong>{p.customers}</strong> clientes</span>
                <span><strong>{p.attendances}</strong> atendimentos</span>
                <span><strong>{brl(p.purchases)}</strong> em compras</span>
                <span><strong>{brl(p.discounts)}</strong> em descontos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase">
                {p.status}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/parceiros/$id" params={{ id: p.id }}>
                  Ver análise <ArrowRight />
                </Link>
              </Button>
              {p.status !== "aprovado" ? (
                <Button size="sm" onClick={() => setStatus.mutate({ id: p.id, status: "aprovado" })}>
                  Aprovar
                </Button>
              ) : null}
              {p.status !== "suspenso" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: p.id, status: "suspenso" })}
                >
                  Suspender
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-muted-foreground">Nenhum parceiro encontrado.</p>
        ) : null}
      </div>
    </div>
  );
}
