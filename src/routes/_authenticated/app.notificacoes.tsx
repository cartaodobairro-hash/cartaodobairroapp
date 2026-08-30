import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { dateTimeBR } from "@/lib/format";

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

  const { data: items } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Notificações"
        description={unread ? `${unread} não lida(s)` : "Tudo em dia"}
        action={
          unread ? (
            <Button size="sm" variant="outline" onClick={() => markAll.mutate()}>
              Marcar todas como lidas
            </Button>
          ) : null
        }
      />
      <div className="space-y-2">
        {(items ?? []).map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 shadow-card ${
              n.read_at ? "border-border bg-card" : "border-primary/40 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{n.title}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {dateTimeBR(n.created_at)}
              </span>
            </div>
            {n.message ? <p className="mt-1 text-sm text-muted-foreground">{n.message}</p> : null}
          </div>
        ))}
        {!items?.length ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Você ainda não tem notificações.
          </p>
        ) : null}
      </div>
    </div>
  );
}
