import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/shells";

export function PartnerViewStats({ partnerId }: { partnerId?: string }) {
  const { data } = useQuery({
    queryKey: ["partner-view-stats", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_view_stats", { _partner_id: partnerId! });
      if (error) throw error;
      return (data as { total: number; unique_viewers: number; last_30_days: number; last_7_days: number }[])?.[0];
    },
  });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <StatCard label="Visualizações do perfil" value={Number(data?.total ?? 0)} tone="brand" />
      <StatCard label="Pessoas diferentes" value={Number(data?.unique_viewers ?? 0)} hint="Usuários logados" />
      <StatCard label="Últimos 30 dias" value={Number(data?.last_30_days ?? 0)} hint={`${Number(data?.last_7_days ?? 0)} nos últimos 7 dias`} />
    </div>
  );
}
