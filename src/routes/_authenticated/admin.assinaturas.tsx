import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brl, dateBR } from "@/lib/format";
import { isAdminRole, useRoles } from "@/lib/auth";
import { StatusPill } from "./admin.clientes.index";

export const Route = createFileRoute("/_authenticated/admin/assinaturas")({
  component: AdminSubscriptions,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  ),
});

type Filter = "todas" | "ativo" | "pendente" | "vencidas" | "cancelado";

const filters: { key: Filter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "vencidas", label: "Vencidas" },
  { key: "pendente", label: "Pendentes" },
  { key: "ativo", label: "Ativas" },
  { key: "cancelado", label: "Canceladas" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addPeriod(period?: string | null) {
  const d = new Date();
  if (period === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [busy, setBusy] = useState<string | null>(null);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<{
    id: string;
    customerName: string;
  } | null>(null);
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const canDeleteSubscriptions = isAdminRole(roles);

  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, customer_id, amount, status, start_date, next_due_date, payment_method, created_at, plans(name, period), customers(id, user_id, city, cards(card_number, status))",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const userIds = (subscriptions ?? []).map((s) => s.customers?.user_id).filter(Boolean) as string[];

  const { data: profiles } = useQuery({
    queryKey: ["admin-subscription-profiles", userIds.length],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, cpf")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
  });

  const byUser = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.id, p])),
    [profiles],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.rpc("delete_subscription_with_payments", {
        _subscription_id: subscriptionId,
      });
      if (error) throw error;
      if (!data) throw new Error("Assinatura não encontrada.");
    },
    onSuccess: () => {
      invalidate();
      setSubscriptionToDelete(null);
      toast.success("Assinatura e mensalidades excluídas");
    },
    onError: (error: Error) => {
      toast.error("Não foi possível excluir a assinatura", { description: error.message });
    },
  });

  const all = subscriptions ?? [];
  const isOverdue = (s: (typeof all)[number]) =>
    !!s.next_due_date && s.next_due_date < today() && s.status !== "cancelado";

  const rows = all.filter((s) => {
    const p = s.customers?.user_id ? byUser[s.customers.user_id] : undefined;
    const hay = [p?.name, p?.email, p?.cpf, p?.phone, s.plans?.name, s.payment_method]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (term.trim() && !hay.includes(term.trim().toLowerCase())) return false;
    if (filter === "todas") return true;
    if (filter === "vencidas") return isOverdue(s);
    return s.status === filter;
  });

  const active = all.filter((s) => s.status === "ativo");
  const overdue = all.filter(isOverdue);
  const pending = all.filter((s) => s.status === "pendente");
  const mrr = active.reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

  async function setStatus(
    sub: (typeof all)[number],
    status: "ativo" | "pendente" | "cancelado",
    renew: boolean,
  ) {
    setBusy(sub.id);
    const payload = renew
      ? { status, next_due_date: addPeriod(sub.plans?.period) }
      : { status };
    const { error } = await supabase.from("subscriptions").update(payload).eq("id", sub.id);
    setBusy(null);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    toast.success(
      status === "ativo" ? "Assinatura reativada e cartão liberado" : `Assinatura ${status}`,
    );
    invalidate();
  }

  async function registerPayment(sub: (typeof all)[number]) {
    setBusy(sub.id);
    const { error } = await supabase.from("payments").insert({
      customer_id: sub.customer_id,
      subscription_id: sub.id,
      amount: Number(sub.amount ?? 0),
      method: sub.payment_method || "manual",
      status: "pago",
      paid_at: new Date().toISOString(),
    });
    if (!error) {
      await supabase
        .from("subscriptions")
        .update({ status: "ativo", next_due_date: addPeriod(sub.plans?.period) })
        .eq("id", sub.id);
    }
    setBusy(null);
    if (error) {
      toast.error("Erro ao registrar cobrança", { description: error.message });
      return;
    }
    toast.success("Cobrança registrada e assinatura ativada");
    invalidate();
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Assinaturas"
        description="Acompanhe vencimentos, situação e cobranças. Reative manualmente sem depender do aviso automático de pagamento."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Ativas" value={String(active.length)} />
        <StatCard label="Pendentes" value={String(pending.length)} />
        <StatCard label="Vencidas" value={String(overdue.length)} />
        <StatCard label="Receita recorrente" value={brl(mrr)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail, CPF ou telefone"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((s) => {
          const profile = s.customers?.user_id ? byUser[s.customers.user_id] : undefined;
          const late = isOverdue(s);
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{profile?.name ?? "Cliente sem cadastro"}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email ?? "sem e-mail"} • {s.plans?.name ?? "sem plano"} •{" "}
                    {brl(s.amount)} / {s.plans?.period ?? "mês"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vencimento {s.next_due_date ? dateBR(s.next_due_date) : "—"}
                    {late ? " • em atraso" : ""} • forma {s.payment_method ?? "não informada"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={late ? "bloqueado" : s.status} />
                  {s.customers?.id ? (
                    <Link
                      to="/admin/clientes/$id"
                      params={{ id: s.customers.id }}
                      className="inline-flex items-center text-xs font-semibold text-muted-foreground"
                    >
                      Ficha <ChevronRight className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy === s.id} onClick={() => void registerPayment(s)}>
                  Registrar cobrança paga
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === s.id}
                  onClick={() => void setStatus(s, "ativo", true)}
                >
                  Reativar + renovar vencimento
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === s.id}
                  onClick={() => void setStatus(s, "pendente", false)}
                >
                  Marcar pendente
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === s.id}
                  onClick={() => void setStatus(s, "cancelado", false)}
                >
                  Cancelar
                </Button>
                {canDeleteSubscriptions && !isLoadingRoles ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy === s.id || deleteMutation.isPending}
                    onClick={() =>
                      setSubscriptionToDelete({
                        id: s.id,
                        customerName: profile?.name ?? "Cliente sem cadastro",
                      })
                    }
                  >
                    <Trash2 />
                    Excluir assinatura
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada.</p>
        ) : null}
      </div>

      <AlertDialog
        open={Boolean(subscriptionToDelete)}
        onOpenChange={(open) => !open && setSubscriptionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {subscriptionToDelete
                ? `A assinatura de ${subscriptionToDelete.customerName} e todas as mensalidades vinculadas serão excluídas definitivamente. O cadastro do cliente e o cartão serão mantidos.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (subscriptionToDelete) deleteMutation.mutate(subscriptionToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir assinatura e mensalidades"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
