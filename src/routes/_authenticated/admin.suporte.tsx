import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  component: AdminSupport,
});

function AdminSupport() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const answer = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ answer: text, status: "inativo" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resposta enviada");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: Error) => toast.error("Erro ao responder", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Suporte" description="Chamados enviados pelos usuários" />
      <div className="space-y-3">
        {(tickets ?? []).map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">{t.subject}</p>
              <span className="text-xs uppercase text-muted-foreground">
                {t.category} • {dateTimeBR(t.created_at)}
              </span>
            </div>
            <p className="mt-2 text-sm">{t.message}</p>
            {t.answer ? (
              <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                <strong>Resposta:</strong> {t.answer}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Escreva a resposta..."
                  value={answers[t.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [t.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  disabled={!answers[t.id]?.trim() || answer.isPending}
                  onClick={() => answer.mutate({ id: t.id, text: answers[t.id]! })}
                >
                  Responder
                </Button>
              </div>
            )}
          </div>
        ))}
        {!tickets?.length ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhum chamado aberto.
          </p>
        ) : null}
      </div>
    </div>
  );
}
