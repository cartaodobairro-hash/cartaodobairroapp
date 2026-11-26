// Regra: cliente com assinatura ativa não pode trocar de plano sozinho
// pelo painel; precisa falar com o suporte.

export type PlanSubscriptionLike = {
  status?: string | null;
  plan_id?: string | null;
} | null | undefined;

export function planSwitchBlocked(
  subscription: PlanSubscriptionLike,
  planId: string,
): boolean {
  return subscription?.status === "ativo" && subscription.plan_id !== planId;
}
