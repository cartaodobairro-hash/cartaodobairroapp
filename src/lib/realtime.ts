import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Escuta mudanças em tempo real do cartão/assinatura/dependentes do cliente
 * e revalida as queries relacionadas.
 */
export function useRealtimeCard(customerId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customerId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["subscription", customerId] });
      queryClient.invalidateQueries({ queryKey: ["dependents", customerId] });
    };

    const channel = supabase
      .channel(`cartao-${customerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `customer_id=eq.${customerId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `customer_id=eq.${customerId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dependents",
          filter: `customer_id=eq.${customerId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, queryClient]);
}
