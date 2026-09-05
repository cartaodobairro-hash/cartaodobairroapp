import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/pagamento")({
  component: PaymentStep,
});

type PlanInfo = { name: string; price: number; period: string; payment_link: string | null };

function PaymentStep() {
  const { data: customer } = useCustomer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [finishing, setFinishing] = useState(false);

  const { data: subscription, isFetching } = useQuery({
    queryKey: ["subscription-payment", customer?.id],
    enabled: !!customer?.id,
    refetchInterval: 6000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const plan = (subscription?.plans ?? null) as unknown as PlanInfo | null;
  const paid = subscription?.status === "ativo";

  useEffect(() => {
    if (!paid || finishing) return;
    setFinishing(true);
    void (async () => {
      toast.success("Pagamento confirmado!", {
        description: "Seu acesso foi liberado. Entre novamente para usar o cartão.",
      });
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { modo: "login" }, replace: true });
    })();
  }, [paid, finishing, navigate, queryClient]);

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Finalize seu pagamento"
        description="Assim que o pagamento for confirmado, seu acesso é liberado automaticamente."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        {paid ? (
          <div className="flex items-center gap-3 text-sm font-semibold">
            <CheckCircle2 className="size-5 text-primary" />
            Pagamento confirmado! Redirecionando...
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold">{plan?.name ?? "Seu plano"}</p>
            <p className="text-xs text-muted-foreground">
              {plan ? `${brl(plan.price)} / ${plan.period === "anual" ? "ano" : "mês"}` : ""}
            </p>

            <Button
              className="mt-4 w-full"
              disabled={!plan?.payment_link}
              onClick={() => {
                if (plan?.payment_link) window.open(plan.payment_link, "_blank", "noopener");
              }}
            >
              Pagar agora <ExternalLink className="ml-2 size-4" />
            </Button>

            {!plan?.payment_link ? (
              <p className="mt-3 text-xs text-muted-foreground">
                O link de pagamento deste plano ainda não foi configurado. Fale com o suporte.
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              Estamos aguardando a confirmação do pagamento. Você pode manter esta tela aberta — ela
              atualiza sozinha.
            </div>

            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => void queryClient.invalidateQueries()}
            >
              Já paguei, verificar agora
            </Button>
          </>
        )}
      </div>

      <ol className="mt-6 space-y-2 pb-8 text-xs text-muted-foreground">
        <li>1. Toque em “Pagar agora” e conclua o pagamento na página segura.</li>
        <li>2. Volte para esta tela — a confirmação chega automaticamente.</li>
        <li>3. Você será levado para a tela de entrar na conta com o acesso liberado.</li>
      </ol>
    </div>
  );
}
