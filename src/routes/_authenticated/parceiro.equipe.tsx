import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCpf, maskPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/parceiro/equipe")({
  component: PartnerTeam,
});

function PartnerTeam() {
  const { data: partner } = usePartner();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", cpf: "", phone: "", role: "Atendente" });

  const { data: employees } = useQuery({
    queryKey: ["employees", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees").insert({
        partner_id: partner!.id,
        name: form.name,
        cpf: form.cpf || null,
        phone: form.phone || null,
        role: form.role,
        can_validate: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador adicionado");
      setForm({ name: "", cpf: "", phone: "", role: "Atendente" });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error("Erro ao adicionar", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, can }: { id: string; can: boolean }) => {
      const { error } = await supabase.from("employees").update({ can_validate: can }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").update({ status: "inativo" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  return (
    <div>
      <PageHeader title="Equipe" description="Colaboradores que podem validar cartões" />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-4">
        <div>
          <Label>Nome</Label>
          <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>CPF</Label>
          <Input
            className="mt-1"
            value={maskCpf(form.cpf)}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            className="mt-1"
            value={maskPhone(form.phone)}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <Label>Função</Label>
          <Input className="mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <Button
          className="md:col-span-4 md:w-fit"
          disabled={!form.name.trim() || !partner?.id || create.isPending}
          onClick={() => create.mutate()}
        >
          Adicionar colaborador
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Função</th>
              <th className="p-3">Validar</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((e) => (
              <tr key={e.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-medium">{e.name}</td>
                <td className="p-3 text-muted-foreground">{e.role ?? "—"}</td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant={e.can_validate ? "default" : "outline"}
                    onClick={() => toggle.mutate({ id: e.id, can: !e.can_validate })}
                  >
                    {e.can_validate ? "Permitido" : "Bloqueado"}
                  </Button>
                </td>
                <td className="p-3 text-xs uppercase">{e.status}</td>
                <td className="p-3 text-right">
                  {e.status === "ativo" ? (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)}>
                      Desativar
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!employees?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
        ) : null}
      </div>
    </div>
  );
}
