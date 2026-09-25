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
    const token = data.proposalToken?.trim();
    const code = data.sellerCode?.trim();
    let sellerId: string | null = null;
    let leadId: string | null = null;
    let planId: string | null = null;

    const { data: profile, error: profileError } = await context.supabase
      .from("profiles").select("email, cpf").eq("id", context.userId).single();
    if (profileError || !profile) throw new Error("Cadastro do cliente não encontrado.");

    if (token) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: lead, error } = await supabaseAdmin
        .from("seller_leads")
        .select("id, seller_id, plan_id, customer_id, email, cpf, sellers!inner(status, seller_code)")
        .eq("proposal_token", token)
        .neq("status", "perdido")
        .eq("sellers.status", "ativo")
        .maybeSingle();
      if (error || !lead || lead.customer_id ||
        lead.email?.trim().toLowerCase() !== profile.email?.trim().toLowerCase() ||
        lead.cpf?.replace(/\D/g, "") !== profile.cpf?.replace(/\D/g, "") ||
        (code && lead.sellers?.seller_code?.toLowerCase() !== code.toLowerCase())) {
        throw new Error("Esta proposta não corresponde ao seu cadastro.");
      }
      sellerId = lead?.seller_id ?? null;
      leadId = lead?.id ?? null;
      planId = lead.plan_id;
    } else if (code) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { data: existing, error: existingError } = await context.supabase
      .from("customers").select("id, seller_id").eq("user_id", context.userId).maybeSingle();
    if (existingError) throw existingError;
    if (existing?.seller_id && existing.seller_id !== sellerId) throw new Error("Este cadastro já pertence a outro vendedor.");
    const { data: customer, error: customerError } = existing
      ? await context.supabase.from("customers").update({ seller_id: sellerId, ...(planId ? { plan_id: planId } : {}) }).eq("id", existing.id).select("id").single()
      : await context.supabase.from("customers").insert({ user_id: context.userId, seller_id: sellerId, ...(planId ? { plan_id: planId } : {}) }).select("id").single();
    if (customerError || !customer) throw new Error("Não foi possível vincular a indicação.");

    if (leadId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("seller_leads")
        .update({ customer_id: customer.id, status: "cadastro", last_contact_at: new Date().toISOString() })
        .eq("id", leadId).is("customer_id", null);
    }
    return { sellerId };
  });