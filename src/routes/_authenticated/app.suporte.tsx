import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/suporte")({
  component: Support,
  head: () => ({
    meta: [
      { title: "Suporte | Cartão do Bairro" },
      { name: "description", content: "Fale com a equipe do Cartão do Bairro e acompanhe seus chamados." },
      { property: "og:title", content: "Suporte | Cartão do Bairro" },
      { property: "og:description", content: "Abra um chamado e acompanhe as respostas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CATEGORIAS = ["Cartão", "Plano e pagamento", "Parceiros", "Dependentes", "Outro"];

function Support() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIAS[0]!);
  const [message, setMessage] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ["tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("support_tickets")
        .insert({ user_id: user!.id, subject, category, message });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado enviado! Responderemos em breve.");
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error("Não foi possível enviar", { description: e.message }),
  });

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Suporte" description="Tire dúvidas e acompanhe seus chamados" />

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div>
          <Label>Assunto</Label>
          <Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Categoria</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Mensagem</Label>
          <Textarea className="mt-1" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <Button
          disabled={!subject.trim() || !message.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Enviando..." : "Enviar chamado"}
        </Button>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">Meus chamados</h2>
      <div className="space-y-2 pb-4">
        {(tickets ?? []).map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{t.subject}</p>
              <span className="text-[11px] uppercase text-muted-foreground">{t.status}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.category} • {dateTimeBR(t.created_at)}
            </p>
            <p className="mt-2 text-sm">{t.message}</p>
            {t.answer ? (
              <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                <strong>Resposta:</strong> {t.answer}
              </p>
            ) : null}
          </div>
        ))}
        {!tickets?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado aberto.</p>
        ) : null}
      </div>
    </div>
  );
}
