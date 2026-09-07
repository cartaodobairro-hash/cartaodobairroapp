import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, dateBR, dateTimeBR, firstOf, maskCpf, maskPhone } from "@/lib/format";
import { isAdminRole, useRoles } from "@/lib/auth";
import { StatusPill } from "./admin.clientes.index";


export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  component: AdminCustomerDetail,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  ),
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>,
});

const genericStatuses = ["ativo", "pendente", "inativo", "bloqueado", "cancelado"] as const;
type GenericStatus = (typeof genericStatuses)[number];

type ProfileForm = { name: string; cpf: string; phone: string; birth_date: string };
type SubForm = {
  amount: string;
  next_due_date: string;
  status: string;
  plan_id: string;
  payment_method: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminCustomerDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: roles } = useRoles();
  const isAdmin = isAdminRole(roles);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [monthsToGenerate, setMonthsToGenerate] = useState("12");
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [subForm, setSubForm] = useState<SubForm | null>(null);


  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
  };

  const { data } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const { data: customer, error } = await supabase
        .from("customers")
        .select(
          "*, plans(id, name, price, period, max_dependents), cards(id, card_number, status, expires_at), dependents(*), subscriptions(*, plans(name, max_dependents)), payments(*)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!customer) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", customer.user_id)
        .maybeSingle();
      const { data: plans } = await supabase
        .from("plans")
        .select("id, name, price, period, max_dependents")
        .order("sort_order");
      return { customer, profile, plans: plans ?? [] };
    },
  });

  if (!data?.customer) {
    return <p className="text-sm text-muted-foreground">Carregando cliente...</p>;
  }

  const { customer, profile, plans } = data;
  const subscription = [...(customer.subscriptions ?? [])].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  )[0];
  const card = firstOf(customer.cards);
  const dependents = customer.dependents ?? [];
  const activeDependents = dependents.filter((d) => !d.removed_at && d.status === "ativo");
  const payments = [...(customer.payments ?? [])].sort(
    (a, b) =>
      +new Date(a.paid_at ?? a.created_at) - +new Date(b.paid_at ?? b.created_at),
  );

  const pv = {
    name: profileForm?.name ?? profile?.name ?? "",
    cpf: profileForm?.cpf ?? profile?.cpf ?? "",
    phone: profileForm?.phone ?? profile?.phone ?? "",
    birth_date: profileForm?.birth_date ?? profile?.birth_date ?? "",
  };

  const sv = {
    amount: subForm?.amount ?? String(subscription?.amount ?? customer.plans?.price ?? ""),
    next_due_date: subForm?.next_due_date ?? subscription?.next_due_date ?? "",
    status: subForm?.status ?? subscription?.status ?? "pendente",
    plan_id: subForm?.plan_id ?? subscription?.plan_id ?? customer.plan_id ?? "",
    payment_method: subForm?.payment_method ?? subscription?.payment_method ?? "",
  };

  async function saveProfile() {
    if (!profile?.id) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: pv.name,
        cpf: pv.cpf.replace(/\D/g, "") || null,
        phone: pv.phone.replace(/\D/g, "") || null,
        birth_date: pv.birth_date || null,
      })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Dados do cliente atualizados");
    invalidate();
  }

  async function saveSubscription() {
    setSavingSub(true);
    const payload = {
      customer_id: customer.id,
      plan_id: sv.plan_id || null,
      amount: Number(sv.amount || 0),
      status: sv.status as GenericStatus,
      next_due_date: sv.next_due_date || null,
      payment_method: sv.payment_method || null,
    };
    const { error } = subscription
      ? await supabase.from("subscriptions").update(payload).eq("id", subscription.id)
      : await supabase
          .from("subscriptions")
          .insert({ ...payload, start_date: new Date().toISOString().slice(0, 10) });
    if (!error && sv.plan_id && sv.plan_id !== customer.plan_id) {
      await supabase.from("customers").update({ plan_id: sv.plan_id }).eq("id", customer.id);
    }
    setSavingSub(false);
    if (error) {
      toast.error("Erro ao salvar assinatura", { description: error.message });
      return;
    }
    toast.success("Assinatura atualizada");
    invalidate();
  }

  async function setCustomerStatus(status: GenericStatus) {
    const { error } = await supabase.from("customers").update({ status }).eq("id", customer.id);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success(`Cliente marcado como ${status}`);
    invalidate();
  }

  async function registerPayment() {
    const amount = Number(sv.amount || 0);
    if (!amount) {
      toast.error("Informe o valor da mensalidade");
      return;
    }
    const { error } = await supabase.from("payments").insert({
      customer_id: customer.id,
      subscription_id: subscription?.id ?? null,
      amount,
      method: sv.payment_method || "manual",
      status: "pago",
      paid_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Erro ao registrar", { description: error.message });
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({ status: "ativo", next_due_date: next.toISOString().slice(0, 10) })
        .eq("id", subscription.id);
    }
    toast.success("Mensalidade registrada");
    setSubForm(null);
    invalidate();
  }

  async function togglePaymentStatus(paymentId: string, status: string) {
    const { error } = await supabase
      .from("payments")
      .update({
        status: status === "pago" ? "pendente" : "pago",
        paid_at: status === "pago" ? null : new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    invalidate();
  }

  async function editPaymentAmount(paymentId: string, current: number) {
    const input = window.prompt(
      "Novo valor da mensalidade (ex: 19,90)",
      String(current).replace(".", ","),
    );
    if (input === null) return;
    const amount = Number(input.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    const { error } = await supabase.from("payments").update({ amount }).eq("id", paymentId);
    if (error) {
      toast.error("Não foi possível alterar", { description: error.message });
      return;
    }
    toast.success("Valor atualizado");
    invalidate();
  }

  async function deletePayment(paymentId: string) {
    if (!window.confirm("Excluir esta mensalidade? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("payments").delete().eq("id", paymentId);
    if (error) {
      toast.error("Não foi possível excluir", { description: error.message });
      return;
    }
    toast.success("Mensalidade excluída");
    invalidate();
  }

  async function generateUpcoming() {
    const amount = Number(sv.amount || 0);
    if (!amount) {
      toast.error("Informe o valor da mensalidade");
      return;
    }
    const months = Number(monthsToGenerate);
    const base = sv.next_due_date ? new Date(`${sv.next_due_date}T12:00:00`) : new Date();
    const rows = Array.from({ length: months }, (_, i) => {
      const due = new Date(base);
      due.setMonth(due.getMonth() + i);
      return {
        customer_id: customer.id,
        subscription_id: subscription?.id ?? null,
        amount,
        method: sv.payment_method || "manual",
        status: "pendente" as const,
        created_at: due.toISOString(),
      };
    });
    setGenerating(true);
    const { error } = await supabase.from("payments").insert(rows);
    setGenerating(false);
    if (error) {
      toast.error("Erro ao gerar mensalidades", { description: error.message });
      return;
    }
    toast.success(`${months} mensalidades geradas`);
    invalidate();
  }


  return (
    <div className="space-y-4 pb-8">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-3" /> Voltar para clientes
      </Link>

      <PageHeader
        title={profile?.name || "Cliente"}
        description={`${profile?.email ?? "sem e-mail"} • cartão ${card?.card_number ?? "não emitido"}`}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase text-muted-foreground">Plano</p>
          <p className="mt-1 font-bold">
            {subscription?.plans?.name ?? customer.plans?.name ?? "Sem plano"}
          </p>
          <p className="text-xs text-muted-foreground">
            {brl(subscription?.amount ?? customer.plans?.price)} /{" "}
            {customer.plans?.period ?? "mês"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase text-muted-foreground">Assinatura</p>
          <div className="mt-1">
            <StatusPill status={subscription?.status ?? "sem assinatura"} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Vence em {subscription?.next_due_date ? dateBR(subscription.next_due_date) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase text-muted-foreground">Cartão</p>
          <div className="mt-1">
            <StatusPill status={card?.status ?? null} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Validade {card?.expires_at ? dateBR(card.expires_at) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase text-muted-foreground">Dependentes</p>
          <p className="mt-1 font-bold">
            {activeDependents.length}
            {customer.plans?.max_dependents ? ` / ${customer.plans.max_dependents}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">vinculados no plano</p>
        </div>
      </div>

      <Section title="Dados pessoais">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome completo</Label>
            <Input
              className="mt-1"
              value={pv.name}
              onChange={(e) => setProfileForm({ ...pv, name: e.target.value })}
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              className="mt-1"
              value={maskCpf(pv.cpf)}
              onChange={(e) => setProfileForm({ ...pv, cpf: e.target.value })}
            />
          </div>
          <div>
            <Label>Celular</Label>
            <Input
              className="mt-1"
              value={maskPhone(pv.phone)}
              onChange={(e) => setProfileForm({ ...pv, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              className="mt-1"
              value={pv.birth_date}
              onChange={(e) => setProfileForm({ ...pv, birth_date: e.target.value })}
            />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input className="mt-1" value={profile?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              className="mt-1"
              value={[customer.street, customer.number, customer.neighborhood, customer.city]
                .filter(Boolean)
                .join(", ")}
              disabled
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void saveProfile()} disabled={savingProfile}>
            {savingProfile ? "Salvando..." : "Salvar dados"}
          </Button>
          <span className="text-xs text-muted-foreground">Cadastro:</span>
          <StatusPill status={customer.status} />
          {genericStatuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={customer.status === s ? "default" : "outline"}
              onClick={() => void setCustomerStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Financeiro / mensalidade">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Plano</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={sv.plan_id}
              onChange={(e) => setSubForm({ ...sv, plan_id: e.target.value })}
            >
              <option value="">Sem plano</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {brl(p.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Valor da mensalidade</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={sv.amount}
              onChange={(e) => setSubForm({ ...sv, amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Próximo vencimento</Label>
            <Input
              className="mt-1"
              type="date"
              value={sv.next_due_date}
              onChange={(e) => setSubForm({ ...sv, next_due_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Situação da assinatura</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={sv.status}
              onChange={(e) => setSubForm({ ...sv, status: e.target.value })}
            >
              {genericStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Input
              className="mt-1"
              placeholder="pix, cartão, dinheiro..."
              value={sv.payment_method}
              onChange={(e) => setSubForm({ ...sv, payment_method: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void saveSubscription()} disabled={savingSub}>
            {savingSub ? "Salvando..." : subscription ? "Atualizar assinatura" : "Criar assinatura"}
          </Button>
          <Button variant="outline" onClick={() => void registerPayment()}>
            Registrar mensalidade paga
          </Button>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={monthsToGenerate}
            onChange={(e) => setMonthsToGenerate(e.target.value)}
          >
            {[3, 6, 12, 24].map((n) => (
              <option key={n} value={String(n)}>
                {n} meses
              </option>
            ))}
          </select>
          <Button variant="outline" disabled={generating} onClick={() => void generateUpcoming()}>
            {generating ? "Gerando..." : "Gerar próximas mensalidades"}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Ativar a assinatura emite ou reativa o cartão digital automaticamente; inativar bloqueia o
          cartão.
        </p>
      </Section>

      <Section title={`Dependentes (${activeDependents.length})`}>
        <div className="space-y-2">
          {dependents.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.cpf ? `CPF ${maskCpf(d.cpf)} • ` : ""}
                  {d.relationship ?? "dependente"} • incluído em{" "}
                  {dateBR(d.added_at ?? d.created_at)}
                  {d.removed_at ? ` • removido em ${dateBR(d.removed_at)}` : ""}
                </p>
              </div>
              <StatusPill status={d.removed_at ? "inativo" : d.status} />
            </div>
          ))}
          {!dependents.length ? (
            <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>
          ) : null}
        </div>
      </Section>

      <Section title="Histórico de pagamentos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Data</th>
                <th className="py-2">Valor</th>
                <th className="py-2">Forma</th>
                <th className="py-2">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-2 text-muted-foreground">
                    {dateTimeBR(p.paid_at ?? p.created_at)}
                  </td>
                  <td className="py-2 font-semibold">{brl(p.amount)}</td>
                  <td className="py-2 text-xs uppercase text-muted-foreground">{p.method}</td>
                  <td className="py-2">
                    <StatusPill status={p.status === "pago" ? "ativo" : "pendente"} />
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void togglePaymentStatus(p.id, p.status)}
                    >
                      {p.status === "pago" ? "Marcar pendente" : "Marcar pago"}
                    </Button>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void deletePayment(p.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
