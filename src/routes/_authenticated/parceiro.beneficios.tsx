import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/parceiro/beneficios")({
  component: PartnerBenefits,
});

function PartnerBenefits() {
  const { data: partner } = usePartner();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_percentage: "10",
    normal_price: "",
    discount_price: "",
    rules: "",
  });

  const { data: benefits } = useQuery({
    queryKey: ["partner-benefits", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("benefits").insert({
        partner_id: partner!.id,
        title: form.title,
        description: form.description || null,
        discount_percentage: Number(form.discount_percentage || 0),
        normal_price: form.normal_price ? Number(form.normal_price) : null,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        rules: form.rules || null,
        status: "ativo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benefício criado");
      setForm({ title: "", description: "", discount_percentage: "10", normal_price: "", discount_price: "", rules: "" });
      queryClient.invalidateQueries({ queryKey: ["partner-benefits"] });
    },
    onError: (e: Error) => toast.error("Erro ao criar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benefício removido");
      queryClient.invalidateQueries({ queryKey: ["partner-benefits"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  if (!partner) return <p className="text-sm text-muted-foreground">Cadastre sua empresa primeiro.</p>;

  return (
    <div>
      <PageHeader title="Benefícios" description="Descontos oferecidos aos associados" />

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input
            className="mt-1"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="20% em todo o cardápio"
          />
        </div>
        <div>
          <Label>Desconto (%)</Label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={100}
            value={form.discount_percentage}
            onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Preço normal</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={form.normal_price}
              onChange={(e) => setForm({ ...form, normal_price: e.target.value })}
            />
          </div>
          <div>
            <Label>Com desconto</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={form.discount_price}
              onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Regras de uso</Label>
          <Input
            className="mt-1"
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            placeholder="Não cumulativo. Válido de segunda a sexta."
          />
        </div>
        <div className="md:col-span-2">
          <Button disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Adicionar benefício"}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-2">
        {(benefits ?? []).map((b) => (
          <div
            key={b.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div>
              <p className="font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">
                {b.discount_percentage}% OFF
                {b.normal_price ? ` • de ${brl(b.normal_price)} por ${brl(b.discount_price)}` : ""}
              </p>
              {b.rules ? <p className="mt-1 text-xs text-muted-foreground">{b.rules}</p> : null}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!benefits?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum benefício cadastrado.</p>
        ) : null}
      </div>
    </div>
  );
}
