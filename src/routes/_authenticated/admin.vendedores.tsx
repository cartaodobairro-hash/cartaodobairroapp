import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  component: AdminSellers,
});

function AdminSellers() {
  const { data: sellers } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*, seller_sales(amount, commission_amount)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader title="Vendedores" description="Equipe de vendas e comissões" />
      <div className="space-y-2">
        {(sellers ?? []).map((s) => {
          const sales = s.seller_sales ?? [];
          const total = sales.reduce((acc, v) => acc + Number(v.amount ?? 0), 0);
          const commission = sales.reduce((acc, v) => acc + Number(v.commission_amount ?? 0), 0);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  Código {s.seller_code} • {[s.neighborhood, s.city].filter(Boolean).join(" - ")}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Vendas</span>
                  {sales.length}
                </span>
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Valor</span>
                  {brl(total)}
                </span>
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Comissão</span>
                  {brl(commission)}
                </span>
              </div>
            </div>
          );
        })}
        {!sellers?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado.</p>
        ) : null}
      </div>
    </div>
  );
}
