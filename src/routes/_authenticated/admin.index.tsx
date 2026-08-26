import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/shells";
import { useRoles, isAdminRole } from "@/lib/auth";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { data: roles, isLoading: loadingRoles } = useRoles();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [customers, partners, pending, sellers, payments] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
        supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("payments").select("amount").eq("status", "pago"),
      ]);
      const revenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
      return {
        customers: customers.count ?? 0,
        partners: partners.count ?? 0,
        pending: pending.count ?? 0,
        sellers: sellers.count ?? 0,
        revenue,
      };
    },
  });

  if (loadingRoles) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!isAdminRole(roles))
    return (
      <p className="text-sm text-muted-foreground">
        Você não tem permissão para acessar o painel administrativo.
      </p>
    );

  return (
    <div>
      <PageHeader title="Visão geral" description="Indicadores do Cartão do Bairro" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Associados" value={stats?.customers ?? 0} tone="brand" />
        <StatCard label="Parceiros ativos" value={stats?.partners ?? 0} />
        <StatCard label="Aguardando aprovação" value={stats?.pending ?? 0} />
        <StatCard label="Vendedores" value={stats?.sellers ?? 0} />
        <StatCard label="Receita confirmada" value={brl(stats?.revenue ?? 0)} tone="ink" />
      </div>
    </div>
  );
}
