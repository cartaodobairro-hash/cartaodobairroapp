import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { dateTimeBR } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/lib/notifications";
import { AttendanceReview } from "@/components/attendance-review";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/notificacoes")({
  component: Notifications,
  head: () => ({
    meta: [
      { title: "Notificações | Cartão do Bairro" },
      { name: "description", content: "Avisos sobre seu cartão, plano e benefícios do bairro." },
      { property: "og:title", content: "Notificações | Cartão do Bairro" },
      { property: "og:description", content: "Avisos sobre seu cartão, plano e benefícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading, isError, refetch } = useNotifications();
  const [selected, setSelected] = useState<{ usageId: string; name: string } | null>(null);
  const { data: reviews } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("reviews").select("card_usage_id").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("Não foi possível marcar os avisos como lidos."),
  });

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Notificações"
        description={unread ? `${unread} não lida(s)` : "Tudo em dia"}
        action={
          unread ? (
            <Button size="sm" variant="outline" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
              Marcar todas como lidas
            </Button>
          ) : null
        }
      />
      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando notificações…</p> : null}
        {isError ? <div><p>Não foi possível carregar os avisos.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : null}
        {(items ?? []).map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 shadow-card ${
              n.read_at ? "border-border bg-card" : "border-primary/40 bg-primary/5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-bold">{n.title}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {dateTimeBR(n.created_at)}
              </span>
            </div>
            {n.message ? <p className="mt-1 text-sm text-muted-foreground">{n.message}</p> : null}
            {n.type === "avaliacao" && n.card_usage_id ? (
              reviews?.some((review) => review.card_usage_id === n.card_usage_id) ? <p className="mt-3 text-sm font-semibold text-primary">Avaliação enviada</p> :
              <Button className="mt-3" size="sm" disabled={!reviews} onClick={() => { if (n.card_usage_id) setSelected({ usageId: n.card_usage_id, name: n.partners?.trade_name ?? "Parceiro" }); }}>Avaliar parceiro</Button>
            ) : null}
          </div>
        ))}
        {!isLoading && !isError && !items?.length ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Você ainda não tem notificações.
          </p>
        ) : null}
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Avaliar {selected?.name}</DialogTitle><DialogDescription>Como foi seu atendimento?</DialogDescription></DialogHeader>
          {selected ? <AttendanceReview key={selected.usageId} usageId={selected.usageId} onSuccess={() => setSelected(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
