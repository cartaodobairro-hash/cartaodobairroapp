import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ativa a área de vendas do parceiro: cria (uma vez) um cadastro de vendedor
 * vinculado ao mesmo login do parceiro aprovado. Regras de comissão seguem o
 * padrão definido pela administração e só podem ser alteradas por ela.
 */
export const enablePartnerSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: partner, error } = await context.supabase
      .from("partners")
      .select("id, trade_name, email, phone, whatsapp, city, neighborhood, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !partner) throw new Error("Cadastro de parceiro não encontrado.");
    if (partner.status !== "aprovado") throw new Error("A área de vendas é liberada após a aprovação do parceiro.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("sellers").select("id, status").eq("user_id", context.userId).maybeSingle();
    if (existing) {
      if (existing.status !== "ativo") throw new Error("Sua área de vendas está desativada. Fale com a administração.");
    } else {
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const code = "P" + crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        const { error: insertError } = await supabaseAdmin.from("sellers").insert({
          user_id: context.userId,
          seller_code: code,
          name: partner.trade_name,
          email: partner.email,
          phone: partner.phone,
          whatsapp: partner.whatsapp,
          city: partner.city,
          neighborhood: partner.neighborhood,
        });
        if (!insertError) created = true;
        else if (insertError.code !== "23505") throw new Error("Não foi possível ativar a área de vendas.");
      }
      if (!created) throw new Error("Não foi possível gerar seu código de vendas. Tente novamente.");
    }
    const { data: role } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "seller").maybeSingle();
    if (!role) {
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "seller" });
      if (roleError) throw new Error("Não foi possível liberar as permissões de venda.");
    }
    return { ok: true };
  });
