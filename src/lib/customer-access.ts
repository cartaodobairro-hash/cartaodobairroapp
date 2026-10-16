export type AccessState = "liberado" | "escolher_plano" | "suspenso";

type Sub = { status: string; next_due_date: string | null; created_at?: string };

/** Telas que o cliente pode abrir mesmo sem acesso liberado (para regularizar). */
export const OPEN_APP_PATHS = ["/app/planos", "/app/pagamento", "/app/conta", "/app/suporte"];

/**
 * Regra de acesso do cliente ao app:
 * - cadastro bloqueado/inativo/cancelado → suspenso
 * - assinatura ativa com vencimento em dia → liberado
 * - nunca teve assinatura paga → escolher plano
 * - qualquer outro caso (vencida, pendente após uso, cancelada) → suspenso
 */
export function customerAccess(
  customerStatus: string | null | undefined,
  subs: Sub[],
  hadPaidPayment: boolean,
  today: string = new Date().toISOString().slice(0, 10),
): AccessState {
  if (customerStatus && ["bloqueado", "inativo", "cancelado"].includes(customerStatus)) return "suspenso";
  const current = subs.some(
    (s) => s.status === "ativo" && (!s.next_due_date || s.next_due_date >= today),
  );
  if (current) return "liberado";
  if (!hadPaidPayment) return "escolher_plano";
  return "suspenso";
}
