import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Clock3, Target, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendedor/")({
  component: SellerHome,
});

function SellerHome() {
  const { data: seller, isLoading: sellerLoading } = useSeller();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-dashboard", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const [sales, leads, commissions] = await Promise.all([
        supabase
          .from("seller_sales")
          .select("id, amount, commission_amount, status, created_at, plans(name)")
          .eq("seller_id", seller!.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("seller_leads")
          .select("id, status, created_at")
          .eq("seller_id", seller!.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("seller_commissions")
          .select("id, amount, status, due_date, paid_at, created_at")
          .eq("seller_id", seller!.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      const error = [sales, leads, commissions].find((result) => result.error)?.error;
      if (error) throw error;
      return { sales: sales.data ?? [], leads: leads.data ?? [], commissions: commissions.data ?? [] };
    },
  });

  if (sellerLoading || isLoading) return <p className="text-sm text-muted-foreground">Carregando seu painel...</p>;
  if (!seller) {
    return <p className="text-sm text-muted-foreground">Seu cadastro de vendedor ainda não foi vinculado. Fale com a administração.</p>;
  }

  const sales = data?.sales ?? [];
  const leads = data?.leads ?? [];
  const commissions = data?.commissions ?? [];
  const totalSold = sales.reduce((sum, sale) => sum + Number(sale.amount ?? 0), 0);
  const pending = commissions
    .filter((commission) => !["paga", "cancelada", "estornada"].includes(commission.status))
    .reduce((sum, commission) => sum + Number(commission.amount ?? 0), 0);
  const paid = commissions
    .filter((commission) => commission.status === "paga")
    .reduce((sum, commission) => sum + Number(commission.amount ?? 0), 0);
  const qualifiedLeads = leads.filter((lead) => ["cadastro", "pagamento", "ativo"].includes(lead.status)).length;
  const conversion = leads.length ? Math.round((qualifiedLeads / leads.length) * 100) : 0;
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthSales = sales.filter((sale) => sale.created_at.startsWith(key));
    return {
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      count: monthSales.length,
      amount: monthSales.reduce((sum, sale) => sum + Number(sale.amount ?? 0), 0),
    };
  });
  const maxMonthly = Math.max(...monthly.map((month) => month.amount), 1);
  const salesThisMonth = monthly[5]?.count ?? 0;
  const goalProgress = seller.goal ? Math.min(100, Math.round((salesThisMonth / seller.goal) * 100)) : 0;

  return (
    <div>
      <PageHeader title={`Olá, ${seller.name}`} description={`Código de indicação: ${seller.seller_code}`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendas no mês" value={salesThisMonth} hint={`Meta: ${seller.goal}`} tone="brand" />
        <StatCard label="Valor vendido" value={brl(totalSold)} hint={`${sales.length} vendas no total`} />
        <StatCard label="Leads" value={leads.length} hint={`${conversion}% de conversão`} />
        <StatCard label="A receber" value={brl(pending)} hint={`Pago: ${brl(paid)}`} tone="ink" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold">Evolução das vendas</h2><p className="text-xs text-muted-foreground">Últimos seis meses</p></div>
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div className="mt-6 flex h-44 items-end gap-3 sm:gap-5">
            {monthly.map((month) => (
              <div key={month.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">{month.count}</span>
                <div className="flex h-32 w-full items-end rounded-t-lg bg-muted/60">
                  <div className="w-full rounded-t-lg bg-primary transition-all" style={{ height: `${Math.max(8, (month.amount / maxMonthly) * 100)}%` }} title={brl(month.amount)} />
                </div>
                <span className="text-[11px] capitalize text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Meta mensal</h2><p className="text-xs text-muted-foreground">Acompanhe seu ritmo de vendas</p></div><Target className="size-5 text-primary" /></div>
          <div className="mt-6 flex items-end justify-between"><span className="text-4xl font-extrabold">{goalProgress}%</span><span className="text-sm text-muted-foreground">{salesThisMonth} de {seller.goal}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goalProgress}%` }} /></div>
          <p className="mt-3 text-xs text-muted-foreground">{goalProgress >= 100 ? "Meta atingida. Excelente trabalho!" : `Faltam ${Math.max(0, seller.goal - salesThisMonth)} vendas para atingir a meta.`}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4"><div><p className="text-[11px] uppercase text-muted-foreground">Comissões pagas</p><p className="mt-1 font-bold text-primary">{brl(paid)}</p></div><div><p className="text-[11px] uppercase text-muted-foreground">Conversão</p><p className="mt-1 font-bold">{conversion}%</p></div></div>
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Vendas recentes</h2><ArrowUpRight className="size-4 text-muted-foreground" /></div>
          <div className="space-y-3">
            {sales.slice(0, 5).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-semibold">{sale.plans?.name ?? "Venda"}</p><p className="text-xs text-muted-foreground">{dateBR(sale.created_at)} • {sale.status}</p></div><p className="text-sm font-bold">{brl(sale.amount)}</p></div>)}
            {!sales.length ? <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Comissões</h2><WalletIcon /></div>
          <div className="space-y-3">
            {commissions.slice(0, 5).map((commission) => <div key={commission.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-semibold">{commission.status === "paga" ? "Pagamento confirmado" : "Comissão em processamento"}</p><p className="text-xs text-muted-foreground">{commission.paid_at ? `Pago em ${dateBR(commission.paid_at)}` : commission.due_date ? `Vencimento ${dateBR(commission.due_date)}` : "Sem vencimento"}</p></div><p className={`text-sm font-bold ${commission.status === "paga" ? "text-primary" : ""}`}>{brl(commission.amount)}</p></div>)}
            {!commissions.length ? <p className="text-sm text-muted-foreground">Nenhuma comissão lançada ainda.</p> : null}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"><Users className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Leads qualificados</p><p className="font-bold">{qualifiedLeads}</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"><Clock3 className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Comissões em processamento</p><p className="font-bold">{brl(pending)}</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"><CheckCircle2 className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Comissões recebidas</p><p className="font-bold">{brl(paid)}</p></div></div>
      </div>
    </div>
  );
}

function WalletIcon() {
  return <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">R$</span>;
}
