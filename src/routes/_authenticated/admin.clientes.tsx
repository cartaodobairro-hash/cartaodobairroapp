import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { dateBR, firstOf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const { data: customers } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, city, neighborhood, status, created_at, plans(name), cards(card_number, status)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader title="Clientes" description="Associados cadastrados na plataforma" />
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Cartão</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Bairro</th>
              <th className="p-3">Status</th>
              <th className="p-3">Desde</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-mono text-xs">{firstOf(c.cards)?.card_number ?? "—"}</td>
                <td className="p-3">{c.plans?.name ?? "—"}</td>
                <td className="p-3">{[c.neighborhood, c.city].filter(Boolean).join(" - ") || "—"}</td>
                <td className="p-3 uppercase text-xs">{c.status}</td>
                <td className="p-3 text-muted-foreground">{dateBR(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
