import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { MODULE_LABELS, useAdminAccess, type StaffModule } from "@/lib/staff-access";
import { createStaffMember, deleteStaffMember, updateStaffMember } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe | Cartão do Bairro" },
      { name: "description", content: "Gerencie colaboradores e permissões do painel administrativo." },
      { property: "og:title", content: "Equipe | Cartão do Bairro" },
      { property: "og:description", content: "Gerencie colaboradores e permissões do painel administrativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

type Level = "none" | "view" | "edit";
type Perms = Partial<Record<StaffModule, "view" | "edit">>;
type Member = { user_id: string; name: string; email: string; status: string; permissions: Perms };
type Form = { userId?: string; name: string; email: string; password: string; status: "ativo" | "inativo"; permissions: Perms };

const MODULES = Object.keys(MODULE_LABELS) as StaffModule[];
const empty: Form = { name: "", email: "", password: "", status: "ativo", permissions: {} };

function TeamPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const access = useAdminAccess();
  const canEdit = access.can("equipe", true);
  const create = useServerFn(createStaffMember);
  const update = useServerFn(updateStaffMember);
  const remove = useServerFn(deleteStaffMember);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_members").select("user_id, name, email, status, permissions").order("name");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  function setLevel(m: StaffModule, level: Level) {
    setForm((f) => {
      if (!f) return f;
      const permissions = { ...f.permissions };
      if (level === "none") delete permissions[m];
      else permissions[m] = level;
      return { ...f, permissions };
    });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      if (form.userId) {
        await update({ data: {
          userId: form.userId, name: form.name, status: form.status, permissions: form.permissions,
          ...(form.password ? { password: form.password } : {}),
        } });
        toast.success("Colaborador atualizado");
      } else {
        await create({ data: { name: form.name, email: form.email, password: form.password, permissions: form.permissions } });
        toast.success("Colaborador criado", { description: `Envie o e-mail ${form.email} e a senha para ele entrar.` });
      }
      setForm(null);
      await qc.invalidateQueries({ queryKey: ["staff-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function del(m: Member) {
    if (!confirm(`Excluir o acesso de ${m.name}?`)) return;
    try {
      await remove({ data: { userId: m.user_id } });
      toast.success("Acesso removido");
      await qc.invalidateQueries({ queryKey: ["staff-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Colaboradores com acesso ao painel e as telas que cada um pode usar"
        action={canEdit ? <Button onClick={() => setForm({ ...empty })}><Plus className="size-4" /> Novo colaborador</Button> : null}
      />
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((m) => (
            <div key={m.user_id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === "ativo" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {m.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {MODULES.filter((k) => m.permissions?.[k]).map((k) => (
                  <span key={k} className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
                    {MODULE_LABELS[k]} · {m.permissions[k] === "edit" ? "editar" : "ver"}
                  </span>
                ))}
              </div>
              {canEdit && m.user_id !== user?.id ? (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setForm({ userId: m.user_id, name: m.name, email: m.email, password: "", status: m.status === "ativo" ? "ativo" : "inativo", permissions: { ...m.permissions } })}>
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => del(m)}>
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.userId ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>E-mail de acesso</Label><Input type="email" disabled={!!form.userId} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>{form.userId ? "Nova senha (opcional)" : "Senha"}</Label>
                <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              {form.userId ? (
                <div>
                  <Label>Situação</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo (sem acesso)</option>
                  </select>
                </div>
              ) : null}
              <div>
                <Label>Permissões por tela</Label>
                <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {MODULES.map((m) => {
                    const level: Level = form.permissions[m] ?? "none";
                    return (
                      <div key={m} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-sm">{MODULE_LABELS[m]}</span>
                        <div className="flex gap-1">
                          {(["none", "view", "edit"] as Level[]).map((l) => (
                            <button key={l} type="button" onClick={() => setLevel(m, l)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${level === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                              {l === "none" ? "Sem acesso" : l === "view" ? "Ver" : "Editar"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
