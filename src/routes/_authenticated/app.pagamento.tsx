import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { confirmInfinitePayReturn, createInfinitePayCheckout } from "@/lib/infinitepay.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/app/pagamento")({
  head: () => ({ meta: [
    { title: "Pagamento do plano | Cartão do Bairro" },
    { name: "description", content: "Pague ou renove seu plano do Cartão do Bairro com segurança." },
    { property: "og:title", content: "Pagamento do plano | Cartão do Bairro" },
    { property: "og:description", content: "Pagamento seguro do plano Cartão do Bairro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: z.object({
    retorno: z.string().optional(),
    order_nsu: z.string().optional(),
    transaction_nsu: z.string().optional(),
    slug: z.string().optional(),
  }),
  component: PaymentStep,
});

type PlanInfo = { name: string; price: number; period: string; payment_link: string | null };

function PaymentStep() {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const createCheckout = useServerFn(createInfinitePayCheckout);
  const confirmReturn = useServerFn(confirmInfinitePayReturn);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [renewalConfirmed, setRenewalConfirmed] = useState(false);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);

  const { data: subscription, isFetching } = useQuery({
    queryKey: ["subscription-payment", customer?.id],
    enabled: !!customer?.id,
    refetchInterval: 6000,
    queryFn: async () => {
      const customerId = customer?.id;
      if (!customerId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const plan = (subscription?.plans ?? null) as unknown as PlanInfo | null;
  const paid = subscription?.status === "ativo";

  const { data: pendingPayment } = useQuery({
    queryKey: ["pending-payment", subscription?.id, search.order_nsu, checkoutPaymentId],
    enabled: !!subscription?.id,
    refetchInterval: 6000,
    queryFn: async () => {
      if (!subscription?.id) return null;
      let query = supabase.from("payments")
        .select("id, amount, status")
        .eq("subscription_id", subscription.id);
      if ((search.order_nsu && search.order_nsu !== subscription.id) || checkoutPaymentId) query = query.eq("id", search.order_nsu !== subscription.id ? search.order_nsu ?? "" : checkoutPaymentId ?? "");
      else query = query.eq("status", "pendente").order("created_at", { ascending: true }).limit(1);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if ((search.order_nsu || checkoutPaymentId) && pendingPayment?.status === "pago") {
      setRenewalConfirmed(true);
      void queryClient.invalidateQueries({ queryKey: ["subscription-payment"] });
    }
  }, [search.order_nsu, checkoutPaymentId, pendingPayment?.status, queryClient]);

  useEffect(() => {
    if (!pendingPayment?.id || pendingPayment.status === "pago" || !search.order_nsu || !search.transaction_nsu || !search.slug) return;
    void confirmReturn({
      data: {
        paymentId: pendingPayment.id,
        transactionNsu: search.transaction_nsu,
        slug: search.slug,
      },
    })
      .then((result) => {
        if (result.paid) {
          setRenewalConfirmed(true);
          void queryClient.invalidateQueries({ queryKey: ["subscription-payment"] });
          void queryClient.invalidateQueries({ queryKey: ["pending-payment"] });
        }
      })
      .catch(() => toast.error("Ainda não conseguimos confirmar o pagamento."));
  }, [confirmReturn, pendingPayment?.id, queryClient, search.slug, search.transaction_nsu]);

  async function openCheckout() {
    if (!subscription?.id) return;
    setOpeningCheckout(true);
    try {
      const result = await createCheckout({ data: { subscriptionId: subscription.id } });
      if (result.checkoutUrl) {
        setCheckoutPaymentId(result.paymentId);
        window.location.assign(result.checkoutUrl);
      }
    } catch (error) {
      toast.error("Não foi possível abrir o pagamento", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setOpeningCheckout(false);
    }
  }

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Finalize seu pagamento"
        description="Assim que o pagamento for confirmado, seu acesso é liberado automaticamente."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        {renewalConfirmed ? (
          <div className="flex items-center gap-3 text-sm font-semibold">
            <CheckCircle2 className="size-5 text-primary" />
            Pagamento confirmado! Sua assinatura está em dia.
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold">{plan?.name ?? "Seu plano"}</p>
            <p className="text-xs text-muted-foreground">
              {plan ? `${brl(pendingPayment?.amount ?? subscription?.amount ?? plan.price)} / ${plan.period === "anual" ? "ano" : "mês"}` : ""}
            </p>

            <Button
              className="mt-4 w-full"
              disabled={!subscription?.id || openingCheckout}
              onClick={() => void openCheckout()}
            >
              {openingCheckout ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {paid ? "Pagar próxima mensalidade" : "Pagar agora"} <ExternalLink className="ml-2 size-4" />
            </Button>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              {paid ? "Seu cartão permanece ativo. Ao pagar, o próximo vencimento será atualizado automaticamente." : "Estamos aguardando a confirmação do pagamento. Você pode manter esta tela aberta — ela atualiza sozinha."}
            </div>

            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => { void queryClient.invalidateQueries(); }}
            >
              Já paguei, verificar agora
            </Button>
          </>
        )}
      </div>

      <ol className="mt-6 space-y-2 pb-8 text-xs text-muted-foreground">
        <li>1. Conclua o pagamento na página segura do InfinitePay.</li>
        <li>2. Ao concluir, você volta automaticamente para o Cartão do Bairro.</li>
        <li>3. A mensalidade recebe baixa e seu cartão é liberado para uso.</li>
      </ol>
    </div>
  );
}
