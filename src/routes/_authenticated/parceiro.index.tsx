import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateTimeBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/parceiro/")({
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const { data: partner, isLoading } = usePartner();
  const queryClient = useQueryClient();

  const { data: usage } = useQuery({
    queryKey: ["partner-usage", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_usage")
        .select("id, customer_id, used_at, purchase_amount, amount_saved, benefits(title)")
        .eq("partner_id", partner!.id)
        .order("used_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!partner?.id) return;
    const channel = supabase
      .channel(`partner-summary-${partner.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_usage", filter: `partner_id=eq.${partner.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["partner-usage", partner.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id, queryClient]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (!partner) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-lg font-bold">Nenhuma empresa vinculada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre sua empresa para acessar o painel do parceiro.
        </p>
        <Button asChild className="mt-4">
          <Link to="/parceria">Cadastrar empresa</Link>
        </Button>
      </div>
    );
  }

  const total = (usage ?? []).reduce((s, u) => s + Number(u.amount_saved ?? 0), 0);
  const purchases = (usage ?? []).reduce((s, u) => s + Number(u.purchase_amount ?? 0), 0);
  const customers = new Set((usage ?? []).map((u) => u.customer_id)).size;
  const statusLabel: Record<string, string> = {
    pendente: "Em análise",
    aprovado: "Aprovada",
    reprovado: "Reprovada",
    suspenso: "Suspensa",
  };

  return (
    <div>
      <PageHeader
        title={partner.trade_name}
        description={`Status: ${statusLabel[partner.status] ?? partner.status}`}
        action={
          <Button asChild size="sm">
            <Link to="/parceiro/validar">Validar cartão</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Validações (últimas)" value={usage?.length ?? 0} tone="brand" />
        <StatCard label="Clientes atendidos" value={customers} />
        <StatCard label="Compras registradas" value={brl(purchases)} />
        <StatCard label="Descontos concedidos" value={brl(total)} tone="ink" />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Últimas validações
      </h2>
      <div className="space-y-2">
        {(usage ?? []).map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm shadow-card"
          >
            <span>{u.benefits?.title ?? "Benefício"}</span>
            <span className="text-muted-foreground">{dateTimeBR(u.used_at)}</span>
            <span className="font-semibold">{u.purchase_amount === null ? "Compra não informada" : brl(u.purchase_amount)}</span>
            <span className="text-primary">-{brl(u.amount_saved)}</span>
          </div>
        ))}
        {!usage?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma validação registrada ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
