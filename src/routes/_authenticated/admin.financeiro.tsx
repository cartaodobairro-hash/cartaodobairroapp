import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: AdminFinance,
});

function AdminFinance() {
  const queryClient = useQueryClient();
  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, method, status, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_commissions")
        .select("id, amount, status, due_date, paid_at, sellers(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const rows = payments ?? [];
  const paid = rows.filter((p) => p.status === "pago");
  const pending = rows.filter((p) => p.status === "pendente");
  const mrr = paid
    .filter((p) => {
      const d = new Date(p.paid_at ?? p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + Number(p.amount), 0);
  const commissionsDue = (commissions ?? [])
    .filter((c) => c.status !== "paga" && c.status !== "cancelada")
    .reduce((s, c) => s + Number(c.amount), 0);
  const commissionsPaid = (commissions ?? [])
    .filter((c) => c.status === "paga")
    .reduce((s, c) => s + Number(c.amount), 0);

  const payCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seller_commissions")
        .update({ status: "paga", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissão marcada como paga");
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["seller-commissions"] });
    },
    onError: (error: Error) => toast.error("Não foi possível confirmar o pagamento", { description: error.message }),
  });

  return (
    <div>
      <PageHeader title="Financeiro" description="Recebimentos, pendências e comissões" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Recebido no mês" value={brl(mrr)} tone="brand" />
        <StatCard label="Pagamentos pagos" value={paid.length} />
        <StatCard label="Pendentes" value={pending.length} hint={brl(pending.reduce((s, p) => s + Number(p.amount), 0))} />
        <StatCard label="Comissões a pagar" value={brl(commissionsDue)} tone="ink" />
        <StatCard label="Comissões pagas" value={brl(commissionsPaid)} tone="brand" />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">Pagamentos recentes</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Método</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 text-muted-foreground">{dateBR(p.paid_at ?? p.created_at)}</td>
                <td className="p-3 font-semibold">{brl(p.amount)}</td>
                <td className="p-3">{p.method}</td>
                <td className="p-3 text-xs uppercase">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-4 text-sm text-muted-foreground">Nenhum pagamento registrado.</p> : null}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">Comissões</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Vendedor</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Vencimento</th>
              <th className="p-3">Pago em</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(commissions ?? []).map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="p-3">{c.sellers?.name ?? "—"}</td>
                <td className="p-3 font-semibold">{brl(c.amount)}</td>
                <td className="p-3 text-muted-foreground">{dateBR(c.due_date)}</td>
                <td className="p-3 text-muted-foreground">{c.paid_at ? dateBR(c.paid_at) : "—"}</td>
                <td className="p-3 text-xs uppercase">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{c.status}</span>
                    {!['paga', 'cancelada', 'estornada'].includes(c.status) ? (
                      <Button size="sm" variant="outline" disabled={payCommission.isPending} onClick={() => payCommission.mutate(c.id)}>
                        <CheckCircle2 /> Confirmar pagamento
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!commissions?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma comissão lançada.</p>
        ) : null}
      </div>
    </div>
  );
}
