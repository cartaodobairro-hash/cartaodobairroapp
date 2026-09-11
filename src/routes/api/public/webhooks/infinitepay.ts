import { createFileRoute } from "@tanstack/react-router";

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

function amountInReais(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as Record<string, unknown>)["amount"];
  const cents = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(cents) ? cents / 100 : null;
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

        const subscriptionId = pick(payload, ["order_nsu"]);
        const transactionId = pick(payload, ["transaction_nsu"]);
        const slug = pick(payload, ["invoice_slug", "slug"]);
        if (!subscriptionId || !transactionId || !slug) {
          return new Response("Missing payment identifiers", { status: 400 });
        }

        const verification = await fetch("https://api.checkout.infinitepay.io/payment_check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            handle: "cartao-do-bairro",
            order_nsu: subscriptionId,
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
        if (checked.success !== true || checked.paid !== true) {
          return new Response("Payment not confirmed", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const args: { _subscription_id: string; _amount?: number; _transaction_id: string } = {
          _subscription_id: subscriptionId,
          _transaction_id: transactionId,
        };
        const amount = typeof checked.amount === "number" ? checked.amount / 100 : amountInReais(payload);
        if (amount !== null) args._amount = amount;
        const { data, error } = await supabaseAdmin.rpc("activate_subscription_by_id", args);

        if (error) return new Response(error.message, { status: 500 });
        if (!data) return new Response("Subscription not found", { status: 404 });

        return Response.json({ ok: true });
      },
    },
  },
});
