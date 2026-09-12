import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/parceiro/relatorios")({
  component: PartnerReports,
});

function PartnerReports() {
  const { data: partner } = usePartner();

  const { data: usage } = useQuery({
    queryKey: ["partner-usage", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_usage")
        .select("id, customer_id, used_at, purchase_amount, amount_saved, benefits(title)")
        .eq("partner_id", partner!.id)
        .order("used_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const rows = usage ?? [];
  const now = new Date();
  const monthRows = rows.filter((r) => {
    const d = new Date(r.used_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSaved = rows.reduce((s, r) => s + Number(r.amount_saved ?? 0), 0);
  const totalPurchases = rows.reduce((s, r) => s + Number(r.purchase_amount ?? 0), 0);
  const uniqueCustomers = new Set(rows.map((r) => r.customer_id)).size;

  return (
    <div>
      <PageHeader title="Relatórios" description="Validações e economia gerada aos clientes" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Validações no mês" value={monthRows.length} tone="brand" />
        <StatCard label="Clientes atendidos" value={uniqueCustomers} />
        <StatCard label="Compras registradas" value={brl(totalPurchases)} />
        <StatCard label="Descontos concedidos" value={brl(totalSaved)} tone="ink" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Benefício</th>
              <th className="p-3">Compra</th>
              <th className="p-3">Desconto</th>
              <th className="p-3">Valor final</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 text-muted-foreground">{dateTimeBR(r.used_at)}</td>
                <td className="p-3">{r.benefits?.title ?? "—"}</td>
                <td className="p-3 font-semibold">{r.purchase_amount === null ? "Não informado" : brl(r.purchase_amount)}</td>
                <td className="p-3 text-primary">{brl(r.amount_saved)}</td>
                <td className="p-3 font-semibold">{r.purchase_amount === null ? "—" : brl(Math.max(0, Number(r.purchase_amount) - Number(r.amount_saved)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma validação registrada ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
