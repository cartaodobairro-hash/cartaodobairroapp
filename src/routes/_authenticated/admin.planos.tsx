import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: AdminPlans,
});

type PlanForm = {
  name: string;
  description: string;
  price: string;
  period: string;
  max_dependents: string;
  status: string;
  rules: string;
  highlights: string;
};

function AdminPlans() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Partial<PlanForm>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  async function save(id: string, current: PlanForm) {
    const draft = { ...current, ...drafts[id] };
    setSavingId(id);
    const { error } = await supabase
      .from("plans")
      .update({
        name: draft.name,
        description: draft.description || null,
        price: Number(draft.price.replace(",", ".")) || 0,
        period: draft.period,
        max_dependents: Number(draft.max_dependents) || 0,
        status: draft.status as "ativo" | "inativo",
        rules: draft.rules || null,
        highlights: draft.highlights
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
      })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error("Não foi possível salvar o plano", { description: error.message });
      return;
    }
    toast.success("Plano atualizado");
    queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    queryClient.invalidateQueries({ queryKey: ["plans-active"] });
    queryClient.invalidateQueries({ queryKey: ["public-plans"] });
  }

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Nome, valor, descrição, limite de dependentes, regras, benefícios, periodicidade e status"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {(plans ?? []).map((plan) => {
          const current: PlanForm = {
            name: plan.name,
            description: plan.description ?? "",
            price: String(plan.price),
            period: plan.period,
            max_dependents: String(plan.max_dependents),
            status: plan.status,
            rules: (plan as { rules?: string | null }).rules ?? "",
            highlights: (plan.highlights ?? []).join("\n"),
          };
          const value = { ...current, ...drafts[plan.id] };
          const set = (patch: Partial<PlanForm>) =>
            setDrafts((d) => ({ ...d, [plan.id]: { ...d[plan.id], ...patch } }));

          return (
            <div key={plan.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Nome</Label>
                  <Input className="mt-1" value={value.name} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input className="mt-1" value={value.price} onChange={(e) => set({ price: e.target.value })} />
                </div>
                <div>
                  <Label>Periodicidade</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={value.period}
                    onChange={(e) => set({ period: e.target.value })}
                  >
                    <option value="mensal">mensal</option>
                    <option value="anual">anual</option>
                  </select>
                </div>
                <div>
                  <Label>Limite de dependentes</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    value={value.max_dependents}
                    onChange={(e) => set({ max_dependents: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={value.status}
                    onChange={(e) => set({ status: e.target.value })}
                  >
                    <option value="ativo">ativo</option>
                    <option value="inativo">inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={value.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </div>
              <div>
                <Label>Regras</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={value.rules}
                  onChange={(e) => set({ rules: e.target.value })}
                />
              </div>
              <div>
                <Label>Benefícios (um por linha)</Label>
                <Textarea
                  className="mt-1"
                  rows={6}
                  value={value.highlights}
                  onChange={(e) => set({ highlights: e.target.value })}
                />
              </div>

              <Button onClick={() => void save(plan.id, current)} disabled={savingId === plan.id}>
                {savingId === plan.id ? "Salvando..." : "Salvar plano"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
