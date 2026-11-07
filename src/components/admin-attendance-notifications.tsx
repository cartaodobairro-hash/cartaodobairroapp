import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { dateTimeBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminAttendanceNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useNotifications();
  const items = (data ?? []).filter((item) => item.type === "atendimento");
  const unread = items.filter((item) => !item.read_at).length;
  const mark = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("type", "atendimento").is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    onError: () => toast.error("Não foi possível marcar os avisos como lidos."),
  });

  return <section className="mt-8" aria-label="Notificações de uso do cartão">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-primary" />Uso do cartão{unread > 0 ? <span className="text-sm text-muted-foreground">({unread} não lidas)</span> : null}</h2>
      {unread > 0 ? <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate()}><CheckCheck className="size-4" />Marcar como lidas</Button> : null}
    </div>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando avisos…</p> : null}
    {isError ? <div><p className="text-sm text-muted-foreground">Não foi possível carregar os avisos.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : null}
    {!isLoading && !isError && items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum aviso de atendimento por enquanto.</p> : null}
    <div className="space-y-2">{items.slice(0, 50).map((item) => <article key={item.id} className={`rounded-lg border p-4 ${item.read_at ? "border-border bg-card" : "border-primary/40 bg-primary/5"}`}>
      <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold">{item.title}</h3><time className="text-xs text-muted-foreground">{dateTimeBR(item.created_at)}</time></div>
      <p className="mt-1 break-words text-sm text-muted-foreground">{item.message}</p>
    </article>)}</div>
  </section>;
}