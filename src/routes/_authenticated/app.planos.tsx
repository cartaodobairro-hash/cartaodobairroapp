import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCustomer } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlanCard, PlanComparison, PlanSteps, type PlanRow } from "@/components/plans";
import { brl, dateBR } from "@/lib/format";
import { claimSellerReferral } from "@/lib/seller.functions";

export const Route = createFileRoute("/_authenticated/app/planos")({
  component: AppPlans,
});

function AppPlans() {
  const { user } = useAuth();
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const claimReferral = useServerFn(claimSellerReferral);

  const { data: plans } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("status", "ativo")
        .order("price");
      if (error) throw error;
      return data as unknown as PlanRow[];
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(name, price, period, max_dependents)")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function contract(plan: PlanRow) {
    if (!user) return;
    if (!accepted) {
      toast.error("Aceite os termos para continuar");
      return;
    }
    setBusyId(plan.id);
    try {
      let customerId = customer?.id;
      if (!customerId) {
        const { data, error } = await supabase
          .from("customers")
          .insert({ user_id: user.id, plan_id: plan.id, terms_accepted_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        customerId = data.id;
      } else {
        const { error } = await supabase
          .from("customers")
          .update({ plan_id: plan.id, terms_accepted_at: new Date().toISOString() })
          .eq("id", customerId);
        if (error) throw error;
      }

      const sellerCode = localStorage.getItem("cdb_seller_code") ?? undefined;
      const proposalToken = localStorage.getItem("cdb_proposal_token") ?? undefined;
      if (sellerCode || proposalToken) {
        await claimReferral({ data: {
          ...(sellerCode ? { sellerCode } : {}),
          ...(proposalToken ? { proposalToken } : {}),
        } });
        localStorage.removeItem("cdb_seller_code");
        localStorage.removeItem("cdb_proposal_token");
      }

      const next = new Date();
      if (plan.period === "anual") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
      const nextDue = next.toISOString().slice(0, 10);

      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          customer_id: customerId,
          plan_id: plan.id,
          amount: plan.price,
          status: "pendente",
          start_date: new Date().toISOString().slice(0, 10),
          next_due_date: nextDue,
          payment_method: "infinitepay",
        })
        .select("id")
        .single();
      if (subError) throw subError;

      const { error: payError } = await supabase.from("payments").insert({
        customer_id: customerId,
        subscription_id: sub.id,
        amount: plan.price,
        method: "infinitepay",
        status: "pendente",
      });
      if (payError) throw payError;

      await queryClient.invalidateQueries();
      toast.success(`Plano ${plan.name} selecionado`, {
        description: "Falta só o pagamento para liberar seu cartão.",
      });
      navigate({ to: "/app/pagamento" });

    } catch (e) {
      toast.error("Não foi possível contratar o plano", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  const currentPlanId = subscription?.plan_id ?? customer?.plan_id ?? null;

  return (
    <div className="px-4 pt-5">
      <PageHeader
        title="Escolha seu cartão"
        description="Tenha benefícios e descontos perto de você."
      />

      {subscription ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
          <p className="font-semibold">
            Assinatura {subscription.status} • {subscription.plans?.name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {brl(subscription.amount)} • próximo vencimento {dateBR(subscription.next_due_date)}
          </p>
          {(subscription.plans?.max_dependents ?? 0) > 0 ? (
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/app/dependentes">Gerenciar dependentes</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(plans ?? []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            featured={plan.max_dependents > 0}
            current={currentPlanId === plan.id && subscription?.status === "ativo"}
            action={
              <Button
                className="w-full"
                disabled={busyId !== null}
                onClick={() => void contract(plan)}
              >
                {busyId === plan.id ? "Processando..." : "Escolher plano"}
              </Button>
            }
          />
        ))}
      </div>

      <label className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-card">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
        <span>
          Li e aceito os{" "}
          <Link to="/termos" className="underline">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" className="underline">
            política de privacidade
          </Link>
          .
        </span>
      </label>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Comparação dos planos
      </h2>
      <PlanComparison
        individualPrice={plans?.find((p) => p.max_dependents === 0)?.price ?? 9.9}
        familyPrice={plans?.find((p) => p.max_dependents > 0)?.price ?? 19.9}
      />

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Como funciona
      </h2>
      <div className="pb-6">
        <PlanSteps />
        <p className="mt-3 text-xs text-muted-foreground">
          O pagamento é feito com segurança pelo InfinitePay. Após a confirmação, a mensalidade recebe
          baixa e o cartão digital é liberado automaticamente.
        </p>
      </div>
    </div>
  );
}
