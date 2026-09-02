import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskCep, maskPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/parceiro/perfil")({
  component: PartnerProfile,
});

type Form = Record<string, string>;

function PartnerProfile() {
  const { data: partner } = usePartner();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>({});

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("status", "ativo")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const val = (key: string) => form[key] ?? ((partner as Record<string, unknown> | null)?.[key] as string) ?? "";
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").update(form as TablesUpdate<"partners">).eq("id", partner!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["my-partner"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  if (!partner) {
    return (
      <div>
        <PageHeader title="Perfil da empresa" />
        <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada a esta conta.</p>
      </div>
    );
  }

  const field = (key: string, label: string, mask?: (v: string) => string) => (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={mask ? mask(val(key)) : val(key)}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Perfil da empresa"
        description={`Status: ${partner.status}`}
        action={
          <Button onClick={() => save.mutate()} disabled={!Object.keys(form).length || save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        }
      />
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-2">
        {field("trade_name", "Nome fantasia")}
        {field("company_name", "Razão social")}
        {field("phone", "Telefone", maskPhone)}
        {field("whatsapp", "WhatsApp", maskPhone)}
        {field("email", "E-mail")}
        {field("instagram", "Instagram")}
        {field("website", "Site")}
        <div>
          <Label>Categoria</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={val("category_id")}
            onChange={(e) => set("category_id", e.target.value)}
          >
            <option value="">Selecione</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {field("cep", "CEP", maskCep)}
        {field("street", "Rua")}
        {field("number", "Número")}
        {field("neighborhood", "Bairro")}
        {field("city", "Cidade")}
        {field("state", "UF")}
        {field("opening_hours", "Horário de funcionamento")}
        {field("logo_url", "URL do logo")}
        {field("cover_url", "URL da capa")}
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            rows={4}
            value={val("description")}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
