import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHmac } from "node:crypto";

const uuid = z.string().uuid();
const providerIdentifier = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);

function pick(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested = pick(value, keys);
      if (nested) return nested;
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/webhooks/infinitepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const identifiers = z.object({
          paymentId: uuid,
          transactionId: providerIdentifier,
          slug: providerIdentifier,
        }).safeParse({
          paymentId: pick(payload, ["order_nsu"]),
          transactionId: pick(payload, ["transaction_nsu"]),
          slug: pick(payload, ["invoice_slug", "slug"]),
        });
        if (!identifiers.success) return new Response("Invalid payment identifiers", { status: 400 });
        const { paymentId, transactionId, slug } = identifiers.data;

        const webhookSecret = process.env["INFINITEPAY_WEBHOOK_SECRET"];
        const callback = new URL(request.url);
        const signature = callback.searchParams.get("signature");
        const signedOrder = callback.searchParams.get("order");
        if (!webhookSecret || signedOrder !== paymentId || !signature ||
          !/^[a-f0-9]{64}$/.test(signature) ||
          createHmac("sha256", webhookSecret).update(paymentId).digest("hex") !== signature) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Only verify orders that belong to a locally issued, pending installment.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let { data: payment, error: lookupError } = await supabaseAdmin.from("payments")
          .select("id, amount, subscription_id, status")
          .eq("id", paymentId)
          .maybeSingle();
        // Older checkout links used the subscription ID as the order identifier.
        let legacyOrder = false;
        if (!lookupError && !payment) {
          legacyOrder = true;
          const legacy = await supabaseAdmin.from("payments")
            .select("id, amount, subscription_id, status")
            .eq("subscription_id", paymentId)
            .eq("status", "pendente")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          payment = legacy.data;
          lookupError = legacy.error;
        }
        if (lookupError || !payment?.subscription_id || payment.status !== "pendente") {
          return new Response("Payment not found", { status: 404 });
        }

        const verification = await fetch("https://api.checkout.infinitepay.io/payment_check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            handle: "cartao-do-bairro",
            order_nsu: paymentId,
            transaction_nsu: transactionId,
            slug,
          }),
        });
        if (!verification.ok) return new Response("Payment verification failed", { status: 502 });
        const checked = (await verification.json()) as {
          success?: boolean;
          paid?: boolean;
          amount?: number;
        };
        if (checked.success !== true || checked.paid !== true || typeof checked.amount !== "number") {
          return new Response("Payment not confirmed", { status: 400 });
        }
        if (legacyOrder && checked.amount !== Math.round(Number(payment.amount) * 100)) {
          const legacy = await supabaseAdmin.from("payments")
            .select("id, amount, subscription_id, status")
            .eq("subscription_id", paymentId)
            .eq("status", "pendente")
            .eq("amount", checked.amount / 100)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (legacy.error || !legacy.data) return new Response("Payment not found", { status: 404 });
          payment = legacy.data;
        }

        if (checked.amount !== Math.round(Number(payment.amount) * 100)) return new Response("Amount mismatch", { status: 400 });
        const args: { _subscription_id: string; _amount: number; _transaction_id: string; _payment_id: string } = {
          _subscription_id: payment.subscription_id,
          _payment_id: payment.id,
          _amount: checked.amount / 100,
          _transaction_id: transactionId,
        };
        const { data, error } = await supabaseAdmin.rpc("activate_subscription_by_id", args);

        if (error) {
          console.error("Payment activation failed", error);
          return new Response("Payment activation failed", { status: 500 });
        }
        if (!data) return new Response("Subscription not found", { status: 404 });

        return Response.json({ ok: true });
      },
    },
  },
});
