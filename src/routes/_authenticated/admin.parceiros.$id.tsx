import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, CalendarDays, MapPin, Phone, Store, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateBR, dateTimeBR, maskCnpj, maskPhone, partnerAddress } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/parceiros/$id")({
  head: () => ({
    meta: [
      { title: "Dashboard do Parceiro — Cartão do Bairro" },
      { name: "description", content: "Cadastro, clientes, compras e descontos do parceiro." },
      { property: "og:title", content: "Dashboard do Parceiro — Cartão do Bairro" },
      { property: "og:description", content: "Cadastro, clientes, compras e descontos do parceiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerAnalytics,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Parceiro não encontrado.</p>,
});

function PartnerAnalytics() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-partner-analytics", id],
    queryFn: async () => {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("*, categories(name, icon), sellers(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!partner) return null;
      const { data: usage, error: usageError } = await supabase
        .from("card_usage")
        .select("id, customer_id, used_at, purchase_amount, amount_saved, benefits(title)")
        .eq("partner_id", id)
        .order("used_at", { ascending: false });
      if (usageError) throw usageError;
      const customerIds = [...new Set((usage ?? []).map((row) => row.customer_id))];
      const { data: customers, error: customerError } = customerIds.length
        ? await supabase.from("customers").select("id, user_id").in("id", customerIds)
        : { data: [], error: null };
      if (customerError) throw customerError;
      const userIds = (customers ?? []).map((customer) => customer.user_id);
      const { data: profiles, error: profileError } = userIds.length
        ? await supabase.from("profiles").select("id, name, phone").in("id", userIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const userByCustomer = new Map((customers ?? []).map((customer) => [customer.id, customer.user_id]));
      const profileByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return {
        partner,
        usage: (usage ?? []).map((row) => ({
          ...row,
          customer: profileByUser.get(userByCustomer.get(row.customer_id) ?? ""),
        })),
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-partner-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_usage", filter: `partner_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["admin-partner-analytics", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const chart = useMemo(() => {
    const months = new Map<string, { month: string; compras: number; descontos: number; atendimentos: number }>();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.set(key, {
        month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        compras: 0,
        descontos: 0,
        atendimentos: 0,
      });
    }
    for (const row of data?.usage ?? []) {
      const date = new Date(row.used_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = months.get(key);
      if (!month) continue;
      month.compras += Number(row.purchase_amount ?? 0);
      month.descontos += Number(row.amount_saved ?? 0);
      month.atendimentos += 1;
    }
    return [...months.values()];
  }, [data?.usage]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando análise...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Parceiro não encontrado.</p>;

  const { partner, usage } = data;
  const uniqueCustomers = new Set(usage.map((row) => row.customer_id)).size;
  const purchases = usage.reduce((sum, row) => sum + Number(row.purchase_amount ?? 0), 0);
  const discounts = usage.reduce((sum, row) => sum + Number(row.amount_saved ?? 0), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRows = usage.filter((row) => row.used_at.slice(0, 7) === currentMonth);
  const monthPurchases = monthRows.reduce((sum, row) => sum + Number(row.purchase_amount ?? 0), 0);

  const detail = (label: string, value: string | null | undefined) => (
    <div>
      <dt className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value || "Não informado"}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={partner.trade_name}
        description="Dashboard analítico do parceiro — sem impacto no Fluxo de Caixa"
        action={<Button asChild variant="outline"><Link to="/admin/parceiros"><ArrowLeft /> Voltar</Link></Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Clientes atendidos" value={uniqueCustomers} tone="brand" />
        <StatCard label="Atendimentos" value={usage.length} />
        <StatCard label="Compras registradas" value={brl(purchases)} />
        <StatCard label="Descontos concedidos" value={brl(discounts)} tone="ink" />
        <StatCard label="Compras no mês" value={brl(monthPurchases)} hint={`${monthRows.length} atendimentos`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-center gap-2"><Building2 className="size-5 text-primary" /><h2 className="font-bold">Cadastro completo</h2></div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail("Nome fantasia", partner.trade_name)}
            {detail("Razão social", partner.company_name)}
            {detail("CNPJ", partner.cnpj ? maskCnpj(partner.cnpj) : null)}
            {detail("Categoria", partner.categories?.name)}
            {detail("Status", partner.status.toUpperCase())}
            {detail("Vendedor", partner.sellers?.name)}
            {detail("Telefone", partner.phone ? maskPhone(partner.phone) : null)}
            {detail("WhatsApp", partner.whatsapp ? maskPhone(partner.whatsapp) : null)}
            {detail("E-mail", partner.email)}
            {detail("Instagram", partner.instagram)}
            {detail("Site", partner.website)}
            {detail("Horário", partner.opening_hours)}
            {detail("Endereço", partnerAddress(partner))}
            {detail("Cadastro", dateBR(partner.created_at))}
            {detail("Última atualização", dateTimeBR(partner.updated_at))}
            <div className="sm:col-span-2 lg:col-span-3">{detail("Descrição", partner.description)}</div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="font-bold">Evolução dos últimos 6 meses</h2></div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -14, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value, name) => name === "atendimentos" ? String(value) : brl(Number(value))} />
                <Bar dataKey="compras" name="Compras" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="descontos" name="Descontos" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex items-center gap-2"><UserRound className="size-5 text-primary" /><h2 className="font-bold">Histórico de clientes atendidos</h2></div>
          <span className="text-xs text-muted-foreground">Atualização em tempo real</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Benefício</th><th className="p-3">Compra</th><th className="p-3">Desconto</th><th className="p-3">Valor final</th></tr>
            </thead>
            <tbody>
              {usage.map((row) => {
                const purchase = row.purchase_amount === null ? null : Number(row.purchase_amount);
                const discount = Number(row.amount_saved ?? 0);
                return (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="p-3 text-muted-foreground">{dateTimeBR(row.used_at)}</td>
                    <td className="p-3"><p className="font-semibold">{row.customer?.name ?? "Cliente"}</p><p className="text-xs text-muted-foreground">{row.customer?.phone ? maskPhone(row.customer.phone) : "Sem telefone"}</p></td>
                    <td className="p-3">{row.benefits?.title ?? "Não informado"}</td>
                    <td className="p-3 font-semibold">{purchase === null ? "Não informado" : brl(purchase)}</td>
                    <td className="p-3 text-primary">{brl(discount)}</td>
                    <td className="p-3 font-bold">{purchase === null ? "—" : brl(Math.max(0, purchase - discount))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!usage.length ? <div className="p-8 text-center text-sm text-muted-foreground"><Store className="mx-auto mb-2 size-7" />Nenhum atendimento registrado.</div> : null}
      </section>
    </div>
  );
}