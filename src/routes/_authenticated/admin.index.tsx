import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/shells";
import { useAdminAccess } from "@/lib/staff-access";
import { brl } from "@/lib/format";
import { AdminAttendanceNotifications } from "@/components/admin-attendance-notifications";

export const Route = createFileRoute("/_authenticated/admin/")({
  staticData: { sitemap: false },
  component: AdminHome,
  head: () => ({ meta: [
    { title: "Visão geral administrativa | Cartão do Bairro" },
    { name: "description", content: "Indicadores e avisos de uso do cartão nos parceiros do Cartão do Bairro." },
    { property: "og:title", content: "Visão geral administrativa | Cartão do Bairro" },
    { property: "og:description", content: "Indicadores e avisos de atendimentos do Cartão do Bairro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function AdminHome() {
  const access = useAdminAccess();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: access.isAdmin,
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

  if (access.loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!access.isAdmin)
    return (
      <div>
        <PageHeader title="Bem-vindo" description="Use o menu para acessar as telas liberadas para você." />
      </div>
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
      <AdminAttendanceNotifications />
    </div>
  );
}
