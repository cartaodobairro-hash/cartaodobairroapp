import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleDollarSign, Phone, Target, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateBR } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const funnel: { status: LeadStatus; label: string; color: string }[] = [
  { status: "novo", label: "Novos", color: "bg-sky-500" },
  { status: "contato", label: "Em contato", color: "bg-violet-500" },
  { status: "interessado", label: "Interessados", color: "bg-amber-500" },
  { status: "cadastro", label: "Cadastro", color: "bg-orange-500" },
  { status: "pagamento", label: "Pagamento", color: "bg-emerald-500" },
  { status: "ativo", label: "Ativos", color: "bg-green-600" },
];

export const Route = createFileRoute("/_authenticated/vendedor/")({
  component: SellerHome,
});

function SellerHome() {
  const { data: seller, isLoading: sellerLoading } = useSeller();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-dashboard", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const [salesResult, leadsResult, commissionsResult] = await Promise.all([
        supabase
          .from("seller_sales")
          .select("id, amount, commission_amount, status, created_at")
          .eq("seller_id", seller!.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("seller_leads")
          .select("id, name, phone, status, created_at, last_contact_at")
          .eq("seller_id", seller!.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("seller_commissions")
          .select("amount, status")
          .eq("seller_id", seller!.id),
      ]);
      if (salesResult.error) throw salesResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;
      return {
        sales: salesResult.data ?? [],
        leads: leadsResult.data ?? [],
        commissions: commissionsResult.data ?? [],
      };
    },
  });

  if (sellerLoading || isLoading) return <p className="text-sm text-muted-foreground">Carregando seu dashboard...</p>;
  if (!seller)
    return <p className="text-sm text-muted-foreground">Seu cadastro de vendedor ainda não foi vinculado. Fale com a administração.</p>;

  const sales = data?.sales ?? [];
  const leads = data?.leads ?? [];
  const commissions = data?.commissions ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSales = sales.filter((sale) => new Date(sale.created_at) >= monthStart);
  const monthLeads = leads.filter((lead) => new Date(lead.created_at) >= monthStart);
  const total = sales.reduce((sum, sale) => sum + Number(sale.amount ?? 0), 0);
  const monthTotal = monthSales.reduce((sum, sale) => sum + Number(sale.amount ?? 0), 0);
  const paid = commissions
    .filter((commission) => commission.status === "paga")
    .reduce((sum, commission) => sum + Number(commission.amount ?? 0), 0);
  const pending = commissions
    .filter((commission) => commission.status !== "paga" && commission.status !== "cancelada")
    .reduce((sum, commission) => sum + Number(commission.amount ?? 0), 0);
  const goalProgress = seller.goal ? Math.min(100, Math.round((monthSales.length / seller.goal) * 100)) : 0;
  const convertedLeads = leads.filter((lead) => ["pagamento", "ativo"].includes(lead.status)).length;
  const conversion = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0;
  const counts = new Map<LeadStatus, number>();
  leads.forEach((lead) => counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1));

  return (
    <div>
      <PageHeader title={`Olá, ${seller.name.split(" ")[0]}`} description={`Código de indicação: ${seller.seller_code}`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendas no mês" value={monthSales.length} hint={`${sales.length} no total`} tone="brand" />
        <StatCard label="Faturamento no mês" value={brl(monthTotal)} hint={`${brl(total)} no total`} />
        <StatCard label="Clientes no mês" value={monthLeads.length} hint={`${conversion}% de conversão`} />
        <StatCard label="Comissão a receber" value={brl(pending)} hint={`${brl(paid)} já pagos`} tone="ink" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Target className="size-4 text-primary" /><h2 className="font-bold">Meta mensal</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Acompanhe seu ritmo de vendas</p>
            </div>
            <span className="text-2xl font-extrabold text-primary">{goalProgress}%</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goalProgress}%` }} /></div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{monthSales.length} vendas realizadas</span><span>Meta: {seller.goal} vendas</span></div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /><h2 className="font-bold">Funil de clientes</h2></div><span className="text-xs text-muted-foreground">{leads.length} total</span></div>
          <div className="mt-4 space-y-2.5">
            {funnel.map((item) => {
              const count = counts.get(item.status) ?? 0;
              const width = leads.length ? Math.max(4, Math.round((count / leads.length) * 100)) : 4;
              return <div key={item.status} className="flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${item.color}`} /><span className="w-24 text-muted-foreground">{item.label}</span><div className="h-1.5 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} /></div><strong className="w-5 text-right">{count}</strong></div>;
            })}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="font-bold">Clientes recentes</h2></div><Link to="/vendedor/leads" className="flex items-center gap-1 text-xs font-semibold text-primary">Ver todos <ArrowRight className="size-3" /></Link></div>
          <div className="mt-3 divide-y divide-border">
            {leads.slice(0, 4).map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{lead.name}</p><p className="text-xs text-muted-foreground">{lead.phone || "Sem telefone"} • {dateBR(lead.created_at)}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase">{lead.status}</span></div>)}
            {!leads.length && <p className="py-6 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /><h2 className="font-bold">Últimas vendas</h2></div><Link to="/vendedor/vendas" className="flex items-center gap-1 text-xs font-semibold text-primary">Ver histórico <ArrowRight className="size-3" /></Link></div>
          <div className="mt-3 divide-y divide-border">
            {sales.slice(0, 4).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{brl(sale.amount)}</p><p className="text-xs text-muted-foreground">{dateBR(sale.created_at)} • {sale.status}</p></div><span className="text-xs font-semibold text-emerald-600">+ {brl(sale.commission_amount)}</span></div>)}
            {!sales.length && <p className="py-6 text-sm text-muted-foreground">Nenhuma venda registrada.</p>}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link to="/vendedor/leads" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-semibold shadow-card transition-colors hover:border-primary"><Users className="size-5 text-primary" />Cadastrar cliente</Link>
        <Link to="/vendedor/leads" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-semibold shadow-card transition-colors hover:border-primary"><Phone className="size-5 text-primary" />Atualizar contatos</Link>
        <Link to="/vendedor/vendas" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-semibold shadow-card transition-colors hover:border-primary"><CheckCircle2 className="size-5 text-primary" />Conferir comissões</Link>
      </div>
    </div>
  );
}
