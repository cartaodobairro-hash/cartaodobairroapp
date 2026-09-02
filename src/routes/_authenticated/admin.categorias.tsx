import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: AdminCategories,
});

const slugify = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function AdminCategories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", icon: "Store" });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        name: form.name,
        slug: slugify(form.name),
        icon: form.icon || "Store",
        sort_order: (categories?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      setForm({ name: "", icon: "Store" });
      invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao criar", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"categories"> }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Categorias" description="Segmentos usados na busca de parceiros" />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-3">
        <div>
          <Label>Nome</Label>
          <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Ícone (lucide)</Label>
          <Input className="mt-1" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()}>
            Adicionar
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Ordem</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="p-3">
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) =>
                      e.target.value !== c.name &&
                      update.mutate({ id: c.id, patch: { name: e.target.value } })
                    }
                  />
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="p-3 w-24">
                  <Input
                    type="number"
                    defaultValue={c.sort_order}
                    onBlur={(e) =>
                      update.mutate({ id: c.id, patch: { sort_order: Number(e.target.value) } })
                    }
                  />
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant={c.status === "ativo" ? "default" : "outline"}
                    onClick={() =>
                      update.mutate({
                        id: c.id,
                        patch: { status: c.status === "ativo" ? "inativo" : "ativo" },
                      })
                    }
                  >
                    {c.status}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
