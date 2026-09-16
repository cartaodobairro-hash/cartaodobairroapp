import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendedor/vendas")({
  component: SellerSales,
});

function SellerSales() {
  const { data: seller, isLoading: sellerLoading } = useSeller();

  const { data: sales } = useQuery({
    queryKey: ["seller-sales", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_sales")
        .select("id, amount, commission_amount, status, created_at")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["seller-commissions", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_commissions")
        .select("id, amount, status, due_date, paid_at")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const rows = sales ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const paid = (commissions ?? []).filter((c) => c.status === "paga").reduce((s, c) => s + Number(c.amount), 0);
  const toReceive = (commissions ?? [])
    .filter((c) => c.status !== "paga" && c.status !== "cancelada")
    .reduce((s, c) => s + Number(c.amount), 0);

  if (sellerLoading) return <p className="text-sm text-muted-foreground">Carregando suas vendas...</p>;
  if (!seller) return <p className="text-sm text-muted-foreground">Cadastro de vendedor não encontrado.</p>;

  return (
    <div>
      <PageHeader title="Vendas e comissões" description="Acompanhe seus resultados" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Vendas" value={rows.length} hint={brl(total)} tone="brand" />
        <StatCard label="Comissões a receber" value={brl(toReceive)} />
        <StatCard label="Comissões pagas" value={brl(paid)} tone="ink" />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">Histórico de vendas</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Comissão</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 text-muted-foreground">{dateBR(s.created_at)}</td>
                <td className="p-3 font-semibold">{brl(s.amount)}</td>
                <td className="p-3">{brl(s.commission_amount)}</td>
                <td className="p-3 text-xs uppercase">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-4 text-sm text-muted-foreground">Nenhuma venda registrada.</p> : null}
      </div>
    </div>
  );
}
