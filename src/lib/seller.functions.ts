import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ClaimReferralInput = { sellerCode?: string; proposalToken?: string };

export const claimSellerReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ClaimReferralInput) => {
    if (!input?.sellerCode?.trim() && !input?.proposalToken?.trim()) {
      throw new Error("Indicação não informada.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = data.proposalToken?.trim();
    const code = data.sellerCode?.trim();
    let sellerId: string | null = null;
    let leadId: string | null = null;

    if (token) {
      const { data: lead, error } = await supabaseAdmin
        .from("seller_leads")
        .select("id, seller_id, sellers!inner(status)")
        .eq("proposal_token", token)
        .neq("status", "perdido")
        .eq("sellers.status", "ativo")
        .maybeSingle();
      if (error) throw new Error("Não foi possível validar esta proposta.");
      sellerId = lead?.seller_id ?? null;
      leadId = lead?.id ?? null;
    } else if (code) {
      const { data: seller, error } = await supabaseAdmin
        .from("sellers")
        .select("id")
        .ilike("seller_code", code)
        .eq("status", "ativo")
        .maybeSingle();
      if (error) throw new Error("Não foi possível validar esta indicação.");
      sellerId = seller?.id ?? null;
    }

    if (!sellerId) throw new Error("Vendedor ou proposta não encontrado.");
    const { error: customerError } = await supabaseAdmin
      .from("customers")
      .update({ seller_id: sellerId })
      .eq("user_id", context.userId)
      .or(`seller_id.is.null,seller_id.eq.${sellerId}`);
    if (customerError) throw new Error("Não foi possível vincular a indicação.");

    if (leadId) {
      await supabaseAdmin
        .from("seller_leads")
        .update({ status: "cadastro", last_contact_at: new Date().toISOString() })
        .eq("id", leadId);
    }
    return { sellerId };
  });