import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskPhone } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
const STATUSES: LeadStatus[] = ["novo", "contato", "interessado", "cadastro", "pagamento", "ativo", "perdido"];

export const Route = createFileRoute("/_authenticated/vendedor/leads")({
  component: SellerLeads,
});

function SellerLeads() {
  const { data: seller } = useSeller();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", neighborhood: "" });

  const { data: leads } = useQuery({
    queryKey: ["seller-leads", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_leads")
        .select("*")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do cliente.");
      const { error } = await supabase.from("seller_leads").insert({
        seller_id: seller!.id,
        name: form.name.trim(),
        phone: form.phone || null,
        whatsapp: form.phone || null,
        neighborhood: form.neighborhood || null,
        status: "novo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      setForm({ name: "", phone: "", neighborhood: "" });
      queryClient.invalidateQueries({ queryKey: ["seller-leads"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from("seller_leads")
        .update({ status, last_contact_at: new Date().toISOString() })
        .eq("id", id)
        .eq("seller_id", seller!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-leads"] }),
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  if (!seller) return <p className="text-sm text-muted-foreground">Cadastro de vendedor não encontrado.</p>;

  return (
    <div>
      <PageHeader title="Cadastro de clientes" description="Cadastre novos clientes e acompanhe o atendimento" />

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label>Nome</Label>
          <Input
            className="mt-1"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input
            className="mt-1"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
          />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input
            className="mt-1"
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          />
        </div>
        <div className="md:col-span-4">
          <Button disabled={create.isPending}>Cadastrar cliente</Button>
        </div>
      </form>

      <div className="mt-6 space-y-2">
        {(leads ?? []).map((l) => (
          <div
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div>
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {[l.phone, l.neighborhood].filter(Boolean).join(" • ") || "Sem contato informado"}
              </p>
            </div>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={l.status}
              onChange={(e) => update.mutate({ id: l.id, status: e.target.value as LeadStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
        {!leads?.length ? <p className="text-sm text-muted-foreground">Nenhum cliente ainda.</p> : null}
      </div>
    </div>
  );
}
