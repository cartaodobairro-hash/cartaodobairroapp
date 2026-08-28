import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/auth";
import { useRealtimeCard } from "@/lib/realtime";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateBR, maskCpf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/dependentes")({
  component: Dependents,
});

const emptyForm = { name: "", cpf: "", birth_date: "", relationship: "" };

function Dependents() {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useRealtimeCard(customer?.id);

  const { data: subscription } = useQuery({
    queryKey: ["subscription", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, plans(name, max_dependents)")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: dependents } = useQuery({
    queryKey: ["dependents", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const max = subscription?.plans?.max_dependents ?? customer?.plans?.max_dependents ?? 0;
  const actives = (dependents ?? []).filter((d) => !d.removed_at && d.status === "ativo");
  const removed = (dependents ?? []).filter((d) => d.removed_at || d.status !== "ativo");
  const subscriptionActive = subscription?.status === "ativo";
  const full = actives.length >= max;

  async function add() {
    if (!customer?.id) return;
    if (!form.name.trim()) {
      toast.error("Informe o nome do dependente");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("dependents").insert({
      customer_id: customer.id,
      name: form.name.trim(),
      cpf: form.cpf ? form.cpf.replace(/\D/g, "") : null,
      birth_date: form.birth_date || null,
      relationship: form.relationship || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível adicionar", { description: error.message });
      return;
    }
    setForm(emptyForm);
    toast.success("Dependente adicionado");
    queryClient.invalidateQueries({ queryKey: ["dependents", customer.id] });
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from("dependents")
      .update({ status: "inativo", removed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível remover", { description: error.message });
      return;
    }
    toast.success("Dependente removido");
    queryClient.invalidateQueries({ queryKey: ["dependents", customer?.id] });
  }

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Dependentes"
        description={
          max > 0
            ? `Plano ${subscription?.plans?.name ?? ""} • ${actives.length} de ${max} dependentes`
            : "Disponível apenas no plano Família"
        }
      />

      {max === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
          <p className="font-bold">Seu plano é individual</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O plano Família permite até 10 dependentes, sem exigência de grau de parentesco.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/planos">Ver plano Família</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-bold">Adicionar dependente</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nome completo</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF (opcional)</Label>
                <Input
                  className="mt-1"
                  value={maskCpf(form.cpf)}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de nascimento (opcional)</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Como se identifica (opcional)</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex.: filho, amigo, colega"
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Não é exigida certidão, comprovação de parentesco ou documento de vínculo familiar.
            </p>
            <Button onClick={() => void add()} disabled={saving || full || !subscriptionActive}>
              <UserPlus className="size-4" />
              {saving ? "Salvando..." : "Adicionar dependente"}
            </Button>
            {full ? (
              <p className="text-xs text-destructive">
                Limite de {max} dependentes atingido. Remova um dependente para incluir outro.
              </p>
            ) : null}
            {!subscriptionActive ? (
              <p className="text-xs text-destructive">
                A assinatura precisa estar ativa para incluir dependentes.
              </p>
            ) : null}
          </div>

          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Vinculados ({actives.length}/{max})
          </h2>
          <div className="space-y-2">
            {actives.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <div>
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.relationship ?? "Dependente"}
                    {d.cpf ? ` • ${maskCpf(d.cpf)}` : ""} • incluído em{" "}
                    {dateBR(d.added_at ?? d.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void remove(d.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {!actives.length ? (
              <p className="text-sm text-muted-foreground">Nenhum dependente vinculado ainda.</p>
            ) : null}
          </div>

          {removed.length ? (
            <>
              <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Histórico de remoções
              </h2>
              <div className="space-y-2 pb-6">
                {removed.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-sm"
                  >
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Incluído em {dateBR(d.added_at ?? d.created_at)} • removido em{" "}
                      {dateBR(d.removed_at)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
