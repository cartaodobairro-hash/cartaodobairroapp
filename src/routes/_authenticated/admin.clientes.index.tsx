import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, dateBR, firstOf, maskCpf } from "@/lib/format";
import { isAdminRole, useRoles } from "@/lib/auth";
import { deleteCustomerAccount } from "@/lib/account.functions";
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

export const Route = createFileRoute("/_authenticated/admin/clientes/")({
  head: () => ({ meta: [
    { title: "Clientes | Cartão do Bairro" },
    { name: "description", content: "Gestão administrativa de clientes, planos e cobranças." },
    { property: "og:title", content: "Clientes | Cartão do Bairro" },
    { property: "og:description", content: "Gestão administrativa de clientes, planos e cobranças." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminCustomers,
});

const statusTone: Record<string, string> = {
  ativo: "bg-primary/15 text-primary",
  pendente: "bg-amber-500/15 text-amber-600",
  inativo: "bg-muted text-muted-foreground",
  bloqueado: "bg-destructive/15 text-destructive",
  cancelado: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status }: { status?: string | null }) {
  const s = status ?? "—";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        statusTone[s] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {s}
    </span>
  );
}

function AdminCustomers() {
  const queryClient = useQueryClient();
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const canDeleteCustomers = isAdminRole(roles);
  const [term, setTerm] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomerAccount({ data: { customerId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      setCustomerToDelete(null);
      toast.success("Cliente excluído definitivamente");
    },
    onError: (error: Error) => toast.error("Não foi possível excluir o cliente", { description: error.message }),
  });

  const { data: customers } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, user_id, seller_id, city, neighborhood, status, created_at, sellers(name, seller_code), plans(name, price, period, max_dependents), cards(card_number, status), dependents(id, removed_at, status), subscriptions(id, status, amount, next_due_date, created_at)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const userIds = (customers ?? []).map((c) => c.user_id).filter(Boolean);

  const { data: profiles } = useQuery({
    queryKey: ["admin-customer-profiles", userIds.length],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, cpf, email, phone")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
  });

  const byUser = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.id, p])),
    [profiles],
  );

  const rows = (customers ?? []).filter((c) => {
    if (!term.trim()) return true;
    const p = byUser[c.user_id];
    const hay = [p?.name, p?.cpf, p?.email, firstOf(c.cards)?.card_number, c.city, c.neighborhood]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(term.trim().toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Clientes" description="Cadastros, indicações, planos e pagamentos pendentes" />

      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, CPF, e-mail ou cartão"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Vendedor</th>
              <th className="p-3">CPF</th>
              <th className="p-3">Cartão</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Dependentes</th>
              <th className="p-3">Mensalidade</th>
              <th className="p-3">Vencimento</th>
              <th className="p-3">Status</th>
              <th className="p-3">Desde</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const p = byUser[c.user_id];
              const sub = [...(c.subscriptions ?? [])].sort(
                (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
              )[0];
              const actives = (c.dependents ?? []).filter(
                (d) => !d.removed_at && d.status === "ativo",
              ).length;
              return (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3">
                    <p className="font-semibold">{p?.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{p?.email ?? "—"}</p>
                  </td>
                  <td className="p-3 text-xs">{c.sellers?.name ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{p?.cpf ? maskCpf(p.cpf) : "—"}</td>
                  <td className="p-3 font-mono text-xs">
                    {firstOf(c.cards)?.card_number ?? "—"}
                  </td>
                  <td className="p-3">{c.plans?.name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {actives}
                    {c.plans?.max_dependents ? ` / ${c.plans.max_dependents}` : ""}
                  </td>
                  <td className="p-3">{sub ? brl(sub.amount) : "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {sub?.next_due_date ? dateBR(sub.next_due_date) : "—"}
                  </td>
                  <td className="p-3">
                    <StatusPill status={sub?.status ?? c.status} />
                  </td>
                  <td className="p-3 text-muted-foreground">{dateBR(c.created_at)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: c.id }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        Gerenciar <ChevronRight className="size-3" />
                      </Link>
                      {canDeleteCustomers && !isLoadingRoles ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Excluir cliente ${p?.name || "sem nome"}`}
                          onClick={() => setCustomerToDelete({ id: c.id, name: p?.name || "Sem nome" })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
        ) : null}
      </div>
      <AlertDialog open={Boolean(customerToDelete)} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              {customerToDelete
                ? `${customerToDelete.name} perderá o acesso. Perfil, cartão, dependentes, assinaturas, mensalidades, vendas e propostas serão removidos. Essa ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (customerToDelete) deleteMutation.mutate(customerToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
