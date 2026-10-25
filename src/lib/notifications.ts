import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`customer-notifications-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("notifications").select("*, partners(trade_name)")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}