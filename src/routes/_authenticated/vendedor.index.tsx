import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendedor/")({
  component: SellerHome,
});

function SellerHome() {
  const { data: seller, isLoading } = useSeller();

  const { data: stats } = useQuery({
    queryKey: ["seller-stats", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const [sales, leads, commissions] = await Promise.all([
        supabase.from("seller_sales").select("amount").eq("seller_id", seller!.id),
        supabase.from("seller_leads").select("id", { count: "exact", head: true }).eq("seller_id", seller!.id),
        supabase.from("seller_commissions").select("amount, status").eq("seller_id", seller!.id),
      ]);
      const total = (sales.data ?? []).reduce((s, v) => s + Number(v.amount ?? 0), 0);
      const paid = (commissions.data ?? [])
        .filter((c) => c.status === "paga")
        .reduce((s, v) => s + Number(v.amount ?? 0), 0);
      const pending = (commissions.data ?? [])
        .filter((c) => c.status !== "paga" && c.status !== "cancelada")
        .reduce((s, v) => s + Number(v.amount ?? 0), 0);
      return { sales: sales.data?.length ?? 0, total, leads: leads.count ?? 0, paid, pending };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!seller)
    return (
      <p className="text-sm text-muted-foreground">
        Seu cadastro de vendedor ainda não foi vinculado. Fale com a administração.
      </p>
    );

  const progress = seller.goal ? Math.min(100, Math.round(((stats?.sales ?? 0) / seller.goal) * 100)) : 0;

  return (
    <div>
      <PageHeader title={`Olá, ${seller.name}`} description={`Seu código de indicação: ${seller.seller_code}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendas" value={stats?.sales ?? 0} tone="brand" />
        <StatCard label="Valor vendido" value={brl(stats?.total ?? 0)} />
        <StatCard label="Leads" value={stats?.leads ?? 0} />
        <StatCard label="Comissão a receber" value={brl(stats?.pending ?? 0)} tone="ink" />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Meta mensal</span>
          <span className="text-muted-foreground">
            {stats?.sales ?? 0} / {seller.goal}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Comissões pagas: {brl(stats?.paid ?? 0)}
        </p>
      </div>
    </div>
  );
}
