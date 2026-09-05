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

export const Route = createFileRoute("/api/public/webhooks/infinitepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INFINITEPAY_WEBHOOK_SECRET"];
        const url = new URL(request.url);
        const provided =
          request.headers.get("x-webhook-secret") ?? url.searchParams.get("secret") ?? "";
        if (!secret || provided !== secret) {
          return new Response("Invalid secret", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const email = pick(payload, ["email", "customer_email", "payer_email", "buyer_email"]);
        if (!email) return new Response("Missing email", { status: 400 });

        const transactionId = pick(payload, ["transaction_id", "id", "nsu", "order_nsu"]);
        const rawAmount = (payload as Record<string, unknown>)["amount"];
        const amount =
          typeof rawAmount === "number"
            ? rawAmount
            : typeof rawAmount === "string"
              ? Number(rawAmount)
              : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("activate_subscription_by_email", {
          _email: email,
          _amount: amount,
          _transaction_id: transactionId,
        });
        if (error) return new Response(error.message, { status: 500 });
        if (!data) return new Response("Subscription not found", { status: 404 });

        return Response.json({ ok: true });
      },
    },
  },
});
