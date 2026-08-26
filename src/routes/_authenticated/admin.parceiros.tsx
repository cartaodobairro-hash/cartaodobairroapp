import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { dateBR } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type PartnerStatus = Database["public"]["Enums"]["partner_status"];

export const Route = createFileRoute("/_authenticated/admin/parceiros")({
  component: AdminPartners,
});

function AdminPartners() {
  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, trade_name, company_name, city, neighborhood, status, created_at, categories(name, icon)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PartnerStatus }) => {
      const { error } = await supabase.from("partners").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Parceiros" description="Aprove e gerencie as empresas da rede" />
      <div className="space-y-2">
        {(partners ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div>
              <p className="font-semibold">{p.trade_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.categories?.icon} {p.categories?.name} •{" "}
                {[p.neighborhood, p.city].filter(Boolean).join(" - ")} • {dateBR(p.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase">
                {p.status}
              </span>
              {p.status !== "aprovado" ? (
                <Button size="sm" onClick={() => setStatus.mutate({ id: p.id, status: "aprovado" })}>
                  Aprovar
                </Button>
              ) : null}
              {p.status !== "suspenso" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: p.id, status: "suspenso" })}
                >
                  Suspender
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!partners?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado.</p>
        ) : null}
      </div>
    </div>
  );
}
