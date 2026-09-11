import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INFINITEPAY_HANDLE = "cartao-do-bairro";
const PUBLISHED_ORIGIN = "https://cartaodobairroapp.lovable.app";

const checkoutInput = z.object({
  subscriptionId: z.string().uuid(),
});

const confirmationInput = z.object({
  subscriptionId: z.string().uuid(),
  transactionNsu: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
});

type PaymentCheck = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
};

async function verifyInfinitePayPayment(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}) {
  const response = await fetch("https://api.checkout.infinitepay.io/payment_check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: INFINITEPAY_HANDLE,
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    }),
  });
  if (!response.ok) throw new Error("Não foi possível confirmar o pagamento no InfinitePay.");
  const result = (await response.json()) as PaymentCheck;
  return result.success === true && result.paid === true ? result : null;
}

export const createInfinitePayCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: subscription, error } = await context.supabase
      .from("subscriptions")
      .select("id, amount, status, customers!inner(user_id), plans(name)")
      .eq("id", data.subscriptionId)
      .eq("customers.user_id", context.userId)
      .single();
    if (error || !subscription) throw new Error("Assinatura não encontrada.");
    if (subscription.status === "ativo") return { alreadyPaid: true, checkoutUrl: null };

    const request = getRequest();
    const requestOrigin = request ? new URL(request.url).origin : PUBLISHED_ORIGIN;
    const publicOrigin = requestOrigin.includes("localhost") ? PUBLISHED_ORIGIN : requestOrigin;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("name, email, phone")
      .eq("id", context.userId)
      .single();

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        order_nsu: subscription.id,
        redirect_url: `${publicOrigin}/app/pagamento?retorno=infinitepay`,
        webhook_url: `${publicOrigin}/api/public/webhooks/infinitepay`,
        items: [
          {
            quantity: 1,
            price: Math.round(Number(subscription.amount) * 100),
            description: `Cartão do Bairro — ${subscription.plans?.name ?? "Plano"}`,
          },
        ],
        customer: profile
          ? {
              name: profile.name,
              email: profile.email ?? undefined,
              phone_number: profile.phone ?? undefined,
            }
          : undefined,
      }),
    });
    const result = (await response.json()) as { checkout_url?: string; link?: string; message?: string };
    const checkoutUrl = result.checkout_url ?? result.link;
    if (!response.ok || !checkoutUrl) {
      throw new Error(result.message ?? "Não foi possível abrir o pagamento.");
    }
    return { alreadyPaid: false, checkoutUrl };
  });

export const confirmInfinitePayReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => confirmationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select("id, customers!inner(user_id)")
      .eq("id", data.subscriptionId)
      .eq("customers.user_id", context.userId)
      .maybeSingle();
    if (!subscription) throw new Error("Assinatura não encontrada.");

    const confirmation = await verifyInfinitePayPayment({
      orderNsu: subscription.id,
      transactionNsu: data.transactionNsu,
      slug: data.slug,
    });
    if (!confirmation) return { paid: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const activationArgs: {
      _subscription_id: string;
      _transaction_id: string;
      _amount?: number;
    } = {
      _subscription_id: subscription.id,
      _transaction_id: data.transactionNsu,
    };
    if (typeof confirmation.amount === "number") activationArgs._amount = confirmation.amount / 100;
    const { data: activated, error } = await supabaseAdmin.rpc(
      "activate_subscription_by_id",
      activationArgs,
    );
    if (error || !activated) throw new Error("O pagamento foi confirmado, mas a ativação falhou.");
    return { paid: true };
  });