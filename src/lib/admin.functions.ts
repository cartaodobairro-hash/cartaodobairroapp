import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sellerInput = z.object({
  name: z.string().trim().min(2, "Informe o nome completo do vendedor."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha inicial precisa ter ao menos 6 caracteres."),
  cpf: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  city: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  sellerCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]*$/, "O código deve conter apenas letras, números e hífen.")
    .optional(),
  commissionType: z.enum(["percentual", "fixa"]),
  commissionValue: z.number().finite().min(0),
  goal: z.number().int().min(0),
});

function generatedSellerCode() {
  return `VEND-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export const createSellerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sellerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesError) throw new Error("Não foi possível validar sua permissão.");

    const isAdmin = (roles ?? []).some((item) =>
      ["super_admin", "admin", "financeiro"].includes(item.role),
    );
    if (!isAdmin) throw new Error("Somente administradores podem cadastrar vendedores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let sellerCode = data.sellerCode || generatedSellerCode();
    const { data: existingCode } = await supabaseAdmin
      .from("sellers")
      .select("id")
      .eq("seller_code", sellerCode)
      .maybeSingle();
    if (existingCode) {
      if (data.sellerCode) throw new Error("Este código de vendedor já está em uso.");
      sellerCode = generatedSellerCode();
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        role: "seller",
      },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "Não foi possível criar o acesso.");

    const userId = created.user.id;
    const cleanup = async () => {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    };

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "seller" }, { onConflict: "user_id,role" });
    if (roleError) {
      await cleanup();
      throw new Error("Não foi possível configurar o perfil de vendedor.");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        name: data.name,
        email: data.email.toLowerCase(),
        cpf: data.cpf || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || data.phone || null,
      })
      .eq("id", userId);
    if (profileError) {
      await cleanup();
      throw new Error("Não foi possível salvar o perfil do vendedor.");
    }

    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .insert({
        user_id: userId,
        seller_code: sellerCode,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || data.phone || null,
        email: data.email.toLowerCase(),
        city: data.city || null,
        neighborhood: data.neighborhood || null,
        commission_type: data.commissionType,
        commission_value: data.commissionValue,
        goal: data.goal,
        status: "ativo",
      })
      .select("id, seller_code, name, email, user_id, status")
      .single();
    if (sellerError || !seller) {
      await cleanup();
      throw new Error(sellerError?.message ?? "Não foi possível salvar o vendedor.");
    }

    return { seller };
  });
