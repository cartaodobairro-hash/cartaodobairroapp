import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STAFF_MODULES = [
  "planos", "parceiros", "clientes", "assinaturas", "vendedores", "categorias",
  "banners", "financeiro", "fluxo", "suporte", "equipe",
] as const;

const permissionsSchema = z.record(z.enum(STAFF_MODULES), z.enum(["view", "edit"]));

async function assertCanManage(context: { supabase: any; userId: string }) {
  const [{ data: role }, { data: staff }] = await Promise.all([
    context.supabase.from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["super_admin", "admin", "financeiro"]).limit(1).maybeSingle(),
    context.supabase.from("staff_members").select("status, permissions").eq("user_id", context.userId).maybeSingle(),
  ]);
  const ok = !!role || (staff?.status === "ativo" && (staff.permissions as Record<string, string>)?.equipe === "edit");
  if (!ok) throw new Error("Você não tem permissão para gerenciar colaboradores.");
}

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(255),
      password: z.string().min(6).max(72),
      permissions: permissionsSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password: data.password, email_confirm: true,
      user_metadata: { name: data.name, role: "staff" },
    });
    if (error || !created.user) throw new Error(error?.message?.includes("registered") ? "Este e-mail já está cadastrado." : "Não foi possível criar o acesso.");
    const uid = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "customer");
    await supabaseAdmin.from("customers").delete().eq("user_id", uid);
    const { error: insErr } = await supabaseAdmin.from("staff_members").insert({
      user_id: uid, name: data.name, email, permissions: data.permissions, created_by: context.userId,
    });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("Não foi possível salvar o colaborador.");
    }
    return { ok: true };
  });

export const updateStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      status: z.enum(["ativo", "inativo"]),
      permissions: permissionsSchema,
      password: z.string().min(6).max(72).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context);
    if (data.userId === context.userId) throw new Error("Você não pode alterar as próprias permissões.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("staff_members")
      .update({ name: data.name, status: data.status, permissions: data.permissions })
      .eq("user_id", data.userId);
    if (error) throw new Error("Não foi possível atualizar o colaborador.");
    if (data.password) {
      const { error: pErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
      if (pErr) throw new Error("Permissões salvas, mas não foi possível trocar a senha.");
    }
    return { ok: true };
  });

export const deleteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("staff_members").select("user_id").eq("user_id", data.userId).maybeSingle();
    if (!row) throw new Error("Colaborador não encontrado.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível remover o acesso.");
    return { ok: true };
  });
