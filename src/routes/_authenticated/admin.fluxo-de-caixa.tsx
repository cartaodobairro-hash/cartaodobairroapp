import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Printer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { brl, dateBR } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/fluxo-de-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de Caixa | Cartão do Bairro" }] }),
  component: CashFlowPage,
});

type CashType = Database["public"]["Enums"]["cash_flow_type"];
type CashStatus = Database["public"]["Enums"]["cash_flow_status"];
type Recurrence = Database["public"]["Enums"]["cash_flow_recurrence"];
type Entry = Database["public"]["Tables"]["cash_flow_entries"]["Row"] & {
  cash_flow_categories?: { name: string } | null;
};
type LedgerRow = {
  id: string;
  source: "manual" | "payment" | "commission" | "projection";
  type: CashType;
  description: string;
  counterparty: string;
  category: string;
  categoryId: string | null;
  amount: number;
  date: string;
  status: CashStatus;
  method: string;
  editable?: Entry;
};
type EntryForm = {
  id?: string;
  type: CashType;
  category_id: string;
  description: string;
  counterparty: string;
  amount: string;
  due_date: string;
  expected_date: string;
  competence_date: string;
  status: CashStatus;
  settled_date: string;
  payment_method: string;
  recurrence: Recurrence;
  recurrence_end: string;
  notes: string;
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const today = new Date().toISOString().slice(0, 10);
const initialForm = (type: CashType = "receita"): EntryForm => ({
  type,
  category_id: "",
  description: "",
  counterparty: "",
  amount: "",
  due_date: today,
  expected_date: today,
  competence_date: today,
  status: "previsto",
  settled_date: today,
  payment_method: "",
  recurrence: "nenhuma",
  recurrence_end: "",
  notes: "",
});

function ym(value: string) {
  return value.slice(0, 7);
}
function addMonths(value: string, months: number) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}
function monthDiff(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
}
function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function CashFlowPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"comparativo" | "previsto" | "realizado">("comparativo");
  const [accountType, setAccountType] = useState<CashType>("receita");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EntryForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceValue, setBalanceValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cash-flow"],
    queryFn: async () => {
      const [entries, categories, payments, commissions, subscriptions, balances, customers] = await Promise.all([
        supabase.from("cash_flow_entries").select("*, cash_flow_categories(name)").order("due_date"),
        supabase.from("cash_flow_categories").select("*").eq("status", "ativo").order("sort_order"),
        supabase.from("payments").select("id, amount, method, status, paid_at, created_at, customer_id"),
        supabase.from("seller_commissions").select("id, amount, status, due_date, paid_at, sellers(name)"),
        supabase.from("subscriptions").select("id, amount, status, next_due_date, customer_id, plans(name)"),
        supabase.from("cash_flow_balances").select("*"),
        supabase.from("customers").select("id, profiles(name)"),
      ]);
      const error = [entries, categories, payments, commissions, subscriptions, balances, customers].find((r) => r.error)?.error;
      if (error) throw error;
      return {
        entries: (entries.data ?? []) as Entry[],
        categories: categories.data ?? [],
        payments: payments.data ?? [],
        commissions: commissions.data ?? [],
        subscriptions: subscriptions.data ?? [],
        balances: balances.data ?? [],
        customers: customers.data ?? [],
      };
    },
  });

  const customerNames = useMemo(() => new Map((data?.customers ?? []).map((c) => [c.id, c.profiles?.name ?? "Cliente"])), [data]);
  const ledger = useMemo<LedgerRow[]>(() => {
    if (!data) return [];
    const rows: LedgerRow[] = [];
    for (const entry of data.entries) {
      const interval = entry.recurrence === "mensal" ? 1 : entry.recurrence === "trimestral" ? 3 : entry.recurrence === "semestral" ? 6 : entry.recurrence === "anual" ? 12 : 0;
      const occurrences = interval ? 120 : 1;
      for (let i = 0; i < occurrences; i += 1) {
        const date = i ? addMonths(entry.expected_date ?? entry.due_date, i * interval) : entry.expected_date ?? entry.due_date;
        if (entry.recurrence_end && date > entry.recurrence_end) break;
        if (Number(date.slice(0, 4)) > now.getFullYear() + 2) break;
        rows.push({
          id: `${entry.id}-${i}`,
          source: "manual",
          type: entry.type,
          description: entry.description,
          counterparty: entry.counterparty ?? "—",
          category: entry.cash_flow_categories?.name ?? "Sem categoria",
          categoryId: entry.category_id,
          amount: Number(entry.amount),
          date: i ? date : entry.settled_at?.slice(0, 10) ?? date,
          status: i ? "previsto" : entry.status,
          method: entry.payment_method ?? "—",
          editable: i ? undefined : entry,
        });
      }
    }
    for (const payment of data.payments) {
      rows.push({
        id: `payment-${payment.id}`,
        source: "payment",
        type: "receita",
        description: "Mensalidade",
        counterparty: customerNames.get(payment.customer_id) ?? "Cliente",
        category: "Assinaturas",
        categoryId: null,
        amount: Number(payment.amount),
        date: (payment.paid_at ?? payment.created_at).slice(0, 10),
        status: payment.status === "pago" ? "pago" : payment.status === "cancelado" ? "cancelado" : "previsto",
        method: payment.method,
      });
    }
    for (const commission of data.commissions) {
      rows.push({
        id: `commission-${commission.id}`,
        source: "commission",
        type: "despesa",
        description: "Comissão de venda",
        counterparty: commission.sellers?.name ?? "Vendedor",
        category: "Comissões",
        categoryId: null,
        amount: Number(commission.amount),
        date: (commission.paid_at ?? commission.due_date ?? today).slice(0, 10),
        status: commission.status === "paga" ? "pago" : commission.status === "cancelada" ? "cancelado" : "previsto",
        method: "—",
      });
    }
    for (const subscription of data.subscriptions.filter((s) => s.status === "ativo" && s.next_due_date)) {
      for (let i = 0; i < 12; i += 1) {
        const date = addMonths(subscription.next_due_date!, i);
        const alreadyExists = data.payments.some((p) => p.customer_id === subscription.customer_id && ym((p.paid_at ?? p.created_at)) === ym(date));
        if (alreadyExists) continue;
        rows.push({
          id: `projection-${subscription.id}-${i}`,
          source: "projection",
          type: "receita",
          description: `Assinatura ${subscription.plans?.name ?? ""}`.trim(),
          counterparty: customerNames.get(subscription.customer_id) ?? "Cliente",
          category: "Assinaturas",
          categoryId: null,
          amount: Number(subscription.amount),
          date,
          status: "previsto",
          method: "recorrente",
        });
      }
    }
    return rows.filter((row) => row.status !== "cancelado");
  }, [data, customerNames]);

  const selectedKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const selectedRows = ledger.filter((row) => ym(row.date) === selectedKey);
  const received = selectedRows.filter((r) => r.type === "receita" && r.status === "pago").reduce((s, r) => s + r.amount, 0);
  const receivable = selectedRows.filter((r) => r.type === "receita" && r.status === "previsto").reduce((s, r) => s + r.amount, 0);
  const paid = selectedRows.filter((r) => r.type === "despesa" && r.status === "pago").reduce((s, r) => s + r.amount, 0);
  const payable = selectedRows.filter((r) => r.type === "despesa" && r.status === "previsto").reduce((s, r) => s + r.amount, 0);
  const opening = Number(data?.balances.find((b) => ym(b.reference_month) === selectedKey)?.opening_amount ?? 0);
  const realized = opening + received - paid;
  const projected = opening + received + receivable - paid - payable;
  const overdue = selectedRows.filter((r) => r.status === "previsto" && r.date < today).reduce((s, r) => s + r.amount, 0);

  const monthly = monthNames.map((name, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    const rows = ledger.filter((r) => ym(r.date) === key);
    const inExpected = rows.filter((r) => r.type === "receita").reduce((s, r) => s + r.amount, 0);
    const inPaid = rows.filter((r) => r.type === "receita" && r.status === "pago").reduce((s, r) => s + r.amount, 0);
    const outExpected = rows.filter((r) => r.type === "despesa").reduce((s, r) => s + r.amount, 0);
    const outPaid = rows.filter((r) => r.type === "despesa" && r.status === "pago").reduce((s, r) => s + r.amount, 0);
    return { name, month: index, entradas: inExpected, recebidas: inPaid, saidas: outExpected, pagas: outPaid, resultado: inPaid - outPaid, projetado: inExpected - outExpected };
  });
  const previous = monthly[month === 0 ? 11 : month - 1];
  const current = monthly[month];
  const filteredAccounts = selectedRows.filter((row) => {
    const query = search.toLocaleLowerCase("pt-BR");
    return row.type === accountType && (statusFilter === "todos" || row.status === statusFilter) &&
      (categoryFilter === "todos" || row.categoryId === categoryFilter || row.category === categoryFilter) &&
      (!query || `${row.description} ${row.counterparty}`.toLocaleLowerCase("pt-BR").includes(query));
  });

  async function saveEntry() {
    if (!form || !form.description.trim() || Number(form.amount.replace(",", ".")) <= 0) {
      toast.error("Preencha descrição e valor válido");
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      category_id: form.category_id || null,
      description: form.description.trim(),
      counterparty: form.counterparty.trim() || null,
      amount: Number(form.amount.replace(",", ".")),
      due_date: form.due_date,
      expected_date: form.expected_date || form.due_date,
      competence_date: form.competence_date || form.due_date,
      status: form.status,
      settled_at: form.status === "pago" ? `${form.settled_date || form.due_date}T12:00:00` : null,
      payment_method: form.payment_method.trim() || null,
      recurrence: form.recurrence,
      recurrence_end: form.recurrence === "nenhuma" ? null : form.recurrence_end || null,
      notes: form.notes.trim() || null,
    };
    const result = form.id
      ? await supabase.from("cash_flow_entries").update(payload).eq("id", form.id)
      : await supabase.from("cash_flow_entries").insert(payload);
    setSaving(false);
    if (result.error) return toast.error("Não foi possível salvar", { description: result.error.message });
    toast.success(form.id ? "Lançamento atualizado" : "Lançamento adicionado");
    setForm(null);
    queryClient.invalidateQueries({ queryKey: ["admin-cash-flow"] });
  }

  function editEntry(entry: Entry) {
    setForm({
      id: entry.id,
      type: entry.type,
      category_id: entry.category_id ?? "",
      description: entry.description,
      counterparty: entry.counterparty ?? "",
      amount: String(entry.amount),
      due_date: entry.due_date,
      expected_date: entry.expected_date ?? entry.due_date,
      competence_date: entry.competence_date,
      status: entry.status,
      settled_date: entry.settled_at?.slice(0, 10) ?? entry.due_date,
      payment_method: entry.payment_method ?? "",
      recurrence: entry.recurrence,
      recurrence_end: entry.recurrence_end ?? "",
      notes: entry.notes ?? "",
    });
  }

  async function settle(row: LedgerRow) {
    if (!row.editable) return;
    const { error } = await supabase.from("cash_flow_entries").update({ status: "pago", settled_at: new Date().toISOString() }).eq("id", row.editable.id);
    if (error) return toast.error("Não foi possível confirmar", { description: error.message });
    toast.success(row.type === "receita" ? "Recebimento confirmado" : "Pagamento confirmado");
    queryClient.invalidateQueries({ queryKey: ["admin-cash-flow"] });
  }

  async function removeEntry(entry: Entry) {
    if (!window.confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("cash_flow_entries").delete().eq("id", entry.id);
    if (error) return toast.error("Não foi possível excluir", { description: error.message });
    toast.success("Lançamento excluído");
    queryClient.invalidateQueries({ queryKey: ["admin-cash-flow"] });
  }

  async function saveBalance() {
    const value = Number(balanceValue.replace(",", "."));
    if (!Number.isFinite(value)) return toast.error("Informe um saldo válido");
    const { error } = await supabase.from("cash_flow_balances").upsert({ reference_month: `${selectedKey}-01`, opening_amount: value }, { onConflict: "reference_month" });
    if (error) return toast.error("Não foi possível salvar", { description: error.message });
    toast.success("Saldo inicial atualizado");
    setBalanceOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-cash-flow"] });
  }

  function exportCsv() {
    const lines = [["Data", "Tipo", "Descrição", "Categoria", "Pessoa/Empresa", "Status", "Forma", "Valor"], ...filteredAccounts.map((r) => [dateBR(r.date), r.type, r.description, r.category, r.counterparty, r.status, r.method, r.amount.toFixed(2).replace(".", ",")])];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fluxo-de-caixa-${selectedKey}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const revenueVariation = percentChange(current.recebidas, previous.recebidas);
  const expenseVariation = percentChange(current.pagas, previous.pagas);
  const activeSubs = data?.subscriptions.filter((s) => s.status === "ativo").length ?? 0;
  const paidCount = selectedRows.filter((r) => r.type === "receita" && r.status === "pago").length;
  const health = projected < 0 ? "Risco de caixa negativo" : overdue > received * 0.2 ? "Atenção à inadimplência" : "Fluxo financeiro saudável";

  return (
    <div className="space-y-5 pb-10 print:p-0">
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão executiva, contas, resultados e projeções financeiras"
        action={<div className="flex flex-wrap gap-2 print:hidden"><Button variant="outline" onClick={exportCsv}><Download /> Exportar Excel</Button><Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir / PDF</Button><Button onClick={() => setForm(initialForm(accountType))}><Plus /> Novo lançamento</Button></div>}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-card print:hidden">
        <div><Label>Ano</Label><select className="mt-1 h-9 rounded-md border bg-background px-3 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>{Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((y) => <option key={y}>{y}</option>)}</select></div>
        <div><Label>Mês</Label><select className="mt-1 h-9 rounded-md border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{monthNames.map((name, i) => <option key={name} value={i}>{name}</option>)}</select></div>
        <Button variant="outline" onClick={() => { setBalanceValue(String(opening)); setBalanceOpen(true); }}>Saldo inicial: {brl(opening)}</Button>
        <span className="ml-auto text-xs text-muted-foreground">Dados atualizados automaticamente pelo CRM</span>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando movimentações...</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Previsto para receber" value={brl(receivable)} hint={`${selectedRows.filter((r) => r.type === "receita" && r.status === "previsto").length} lançamentos`} />
        <StatCard label="Já recebido" value={brl(received)} hint={`${paidCount} recebimentos`} tone="brand" />
        <StatCard label="Previsto para pagar" value={brl(payable)} hint={`${selectedRows.filter((r) => r.type === "despesa" && r.status === "previsto").length} compromissos`} />
        <StatCard label="Já pago" value={brl(paid)} hint={`Vencido/pendente: ${brl(overdue)}`} tone="ink" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-card"><p className="text-xs font-semibold uppercase text-muted-foreground">Saldo realizado</p><p className={`mt-1 text-2xl font-extrabold ${realized < 0 ? "text-destructive" : "text-emerald-600"}`}>{brl(realized)}</p><p className="text-xs text-muted-foreground">Saldo inicial + recebimentos − pagamentos</p></div>
        <div className="rounded-2xl border bg-card p-4 shadow-card"><p className="text-xs font-semibold uppercase text-muted-foreground">Saldo projetado</p><p className={`mt-1 text-2xl font-extrabold ${projected < 0 ? "text-destructive" : "text-foreground"}`}>{brl(projected)}</p><p className="text-xs text-muted-foreground">Inclui todos os valores previstos</p></div>
        <div className={`rounded-2xl border p-4 shadow-card ${projected < 0 ? "border-destructive/30 bg-destructive/5" : "border-emerald-200 bg-emerald-50"}`}><p className="flex items-center gap-2 text-xs font-semibold uppercase"><TrendingUp className="size-4" /> Análise executiva</p><p className="mt-2 font-bold">{health}</p><p className="text-xs text-muted-foreground">Receita {revenueVariation >= 0 ? "subiu" : "caiu"} {Math.abs(revenueVariation).toFixed(1)}% e despesas {expenseVariation >= 0 ? "subiram" : "caíram"} {Math.abs(expenseVariation).toFixed(1)}% contra o mês anterior.</p></div>
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Evolução financeira em {year}</h2><p className="text-xs text-muted-foreground">Comparação mensal entre valores previstos e realizados</p></div><div className="flex gap-1 print:hidden">{(["comparativo", "previsto", "realizado"] as const).map((item) => <Button key={item} size="sm" variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>{item}</Button>)}</div></div>
        <ChartContainer className="h-[300px] w-full" config={{ entradas: { label: "Receitas previstas", color: "#f97316" }, recebidas: { label: "Receitas recebidas", color: "#16a34a" }, saidas: { label: "Despesas previstas", color: "#111827" }, pagas: { label: "Despesas pagas", color: "#dc2626" } }}>
          <BarChart data={monthly}><CartesianGrid vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => brl(Number(value))} />} /><Legend />{view !== "realizado" ? <><Bar dataKey="entradas" fill="var(--color-entradas)" radius={[4, 4, 0, 0]} /><Bar dataKey="saidas" fill="var(--color-saidas)" radius={[4, 4, 0, 0]} /></> : null}{view !== "previsto" ? <><Bar dataKey="recebidas" fill="var(--color-recebidas)" radius={[4, 4, 0, 0]} /><Bar dataKey="pagas" fill="var(--color-pagas)" radius={[4, 4, 0, 0]} /></> : null}</BarChart>
        </ChartContainer>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border bg-card p-4 shadow-card">
          <h2 className="font-bold">Resultado mensal e projeção</h2>
          <ChartContainer className="mt-3 h-[240px] w-full" config={{ resultado: { label: "Realizado", color: "#f97316" }, projetado: { label: "Projetado", color: "#111827" } }}>
            <LineChart data={monthly}><CartesianGrid vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => brl(Number(value))} />} /><Legend /><Line type="monotone" dataKey="resultado" stroke="var(--color-resultado)" strokeWidth={3} /><Line type="monotone" dataKey="projetado" stroke="var(--color-projetado)" strokeWidth={2} strokeDasharray="5 5" /></LineChart>
          </ChartContainer>
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-card">
          <h2 className="font-bold">Indicadores do negócio</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Assinaturas ativas" value={String(activeSubs)} />
            <Metric label="Ticket médio" value={brl(paidCount ? received / paidCount : 0)} />
            <Metric label="Inadimplência" value={`${((overdue / Math.max(receivable + received, 1)) * 100).toFixed(1)}%`} />
            <Metric label="Resultado do mês" value={brl(received - paid)} />
            <Metric label="Receita vs. anterior" value={`${revenueVariation >= 0 ? "+" : ""}${revenueVariation.toFixed(1)}%`} />
            <Metric label="Despesa vs. anterior" value={`${expenseVariation >= 0 ? "+" : ""}${expenseVariation.toFixed(1)}%`} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div><h2 className="font-bold">Tabela mensal</h2><p className="text-xs text-muted-foreground">Selecione um mês para abrir os lançamentos</p></div>
          <div className="flex rounded-lg border p-1 print:hidden"><Button size="sm" variant={accountType === "receita" ? "default" : "ghost"} onClick={() => setAccountType("receita")}><ArrowUpRight /> Contas a receber</Button><Button size="sm" variant={accountType === "despesa" ? "default" : "ghost"} onClick={() => setAccountType("despesa")}><ArrowDownRight /> Contas a pagar</Button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Mês</th><th className="p-3">Receitas</th><th className="p-3">Despesas</th><th className="p-3">Realizado</th><th className="p-3">Projetado</th></tr></thead><tbody>{monthly.map((row) => <tr key={row.name} className={`cursor-pointer border-t hover:bg-muted/30 ${month === row.month ? "bg-primary/5" : ""}`} onClick={() => setMonth(row.month)}><td className="p-3 font-semibold">{row.name}/{year}</td><td className="p-3 text-emerald-700">{brl(row.recebidas)} <span className="text-xs text-muted-foreground">/ {brl(row.entradas)}</span></td><td className="p-3 text-destructive">{brl(row.pagas)} <span className="text-xs text-muted-foreground">/ {brl(row.saidas)}</span></td><td className="p-3 font-semibold">{brl(row.resultado)}</td><td className="p-3 font-semibold">{brl(row.projetado)}</td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="rounded-2xl border bg-card shadow-card">
        <div className="border-b p-4"><h2 className="font-bold">{accountType === "receita" ? "Contas a receber" : "Contas a pagar"} — {monthNames[month]}/{year}</h2><div className="mt-3 grid gap-2 sm:grid-cols-3 print:hidden"><Input placeholder="Buscar descrição ou pessoa..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="todos">Todas as situações</option><option value="previsto">Previsto / pendente</option><option value="pago">Pago / recebido</option></select><select className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="todos">Todas as categorias</option>{data?.categories.filter((c) => c.type === accountType).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3">Categoria</th><th className="p-3">Pessoa / empresa</th><th className="p-3">Situação</th><th className="p-3">Valor</th><th className="p-3 print:hidden" /></tr></thead><tbody>{filteredAccounts.sort((a, b) => a.date.localeCompare(b.date)).map((row) => <tr key={row.id} className="border-t"><td className="p-3 whitespace-nowrap">{dateBR(row.date)}</td><td className="p-3"><p className="font-semibold">{row.description}</p><p className="text-xs text-muted-foreground">{row.source === "projection" ? "Projeção automática" : row.method}</p></td><td className="p-3">{row.category}</td><td className="p-3">{row.counterparty}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "pago" ? "bg-emerald-100 text-emerald-700" : row.date < today ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{row.status === "pago" ? (row.type === "receita" ? "recebido" : "pago") : row.date < today ? "atrasado" : "previsto"}</span></td><td className="p-3 font-bold">{brl(row.amount)}</td><td className="p-3 text-right print:hidden">{row.editable ? <div className="flex justify-end gap-1">{row.status !== "pago" ? <Button size="icon" variant="ghost" title="Confirmar" onClick={() => void settle(row)}><CheckCircle2 /></Button> : null}<Button size="icon" variant="ghost" title="Editar" onClick={() => editEntry(row.editable!)}><Pencil /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Excluir" onClick={() => void removeEntry(row.editable!)}><Trash2 /></Button></div> : <span className="text-xs text-muted-foreground">CRM</span>}</td></tr>)}</tbody></table>{!filteredAccounts.length ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado neste período.</p> : null}</div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-card"><h2 className="flex items-center gap-2 font-bold"><CalendarClock className="size-4 text-primary" /> Previsões</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{[1, 2, 3, 6, 12].map((distance) => { const target = addMonths(`${selectedKey}-01`, distance); const rows = ledger.filter((r) => ym(r.date) === ym(target)); const value = rows.filter((r) => r.type === "receita").reduce((s, r) => s + r.amount, 0) - rows.filter((r) => r.type === "despesa").reduce((s, r) => s + r.amount, 0); return <Metric key={distance} label={`+${distance} ${distance === 1 ? "mês" : "meses"}`} value={brl(value)} />; })}</div></section>
        <section className="rounded-2xl border bg-card p-4 shadow-card"><h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-primary" /> Alertas financeiros</h2><div className="mt-3 space-y-2 text-sm"><Alert text={`${selectedRows.filter((r) => r.status === "previsto" && r.date < today).length} lançamento(s) vencido(s), totalizando ${brl(overdue)}.`} danger={overdue > 0} /><Alert text={projected < 0 ? `O saldo projetado está negativo em ${brl(Math.abs(projected))}.` : `Saldo projetado positivo de ${brl(projected)}.`} danger={projected < 0} /><Alert text={`${activeSubs} assinatura(s) ativa(s) alimentam a previsão recorrente.`} /></div></section>
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{form?.id ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription>Cadastre receitas ou despesas únicas e recorrentes.</DialogDescription></DialogHeader>{form ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Tipo"><select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CashType, category_id: "" })}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></Field><Field label="Categoria"><select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Sem categoria</option>{data?.categories.filter((c) => c.type === form.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Descrição"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Cliente, empresa ou fornecedor"><Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} /></Field><Field label="Valor"><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Vencimento"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field><Field label="Data prevista"><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></Field><Field label="Competência"><Input type="date" value={form.competence_date} onChange={(e) => setForm({ ...form, competence_date: e.target.value })} /></Field><Field label="Situação"><select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CashStatus })}><option value="previsto">Previsto</option><option value="pago">{form.type === "receita" ? "Recebido" : "Pago"}</option><option value="cancelado">Cancelado</option></select></Field>{form.status === "pago" ? <Field label="Data efetiva"><Input type="date" value={form.settled_date} onChange={(e) => setForm({ ...form, settled_date: e.target.value })} /></Field> : null}<Field label="Forma de pagamento"><Input placeholder="Pix, cartão, boleto..." value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></Field><Field label="Recorrência"><select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })}><option value="nenhuma">Sem recorrência</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></Field>{form.recurrence !== "nenhuma" ? <Field label="Repetir até"><Input type="date" value={form.recurrence_end} onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })} /></Field> : null}<div className="sm:col-span-2"><Label>Observações</Label><Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={saving} onClick={() => void saveEntry()}>{saving ? "Salvando..." : "Salvar lançamento"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}><DialogContent><DialogHeader><DialogTitle>Saldo inicial de {monthNames[month]}/{year}</DialogTitle><DialogDescription>Informe o saldo disponível no primeiro dia do mês.</DialogDescription></DialogHeader><Field label="Saldo inicial"><Input type="number" step="0.01" value={balanceValue} onChange={(e) => setBalanceValue(e.target.value)} /></Field><DialogFooter><Button variant="outline" onClick={() => setBalanceOpen(false)}>Cancelar</Button><Button onClick={() => void saveBalance()}>Salvar saldo</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label><div className="mt-1">{children}</div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/50 p-3"><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Alert({ text, danger = false }: { text: string; danger?: boolean }) { return <div className={`flex gap-2 rounded-xl p-3 ${danger ? "bg-red-50 text-red-800" : "bg-muted/50"}`}>{danger ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />}<span>{text}</span></div>; }