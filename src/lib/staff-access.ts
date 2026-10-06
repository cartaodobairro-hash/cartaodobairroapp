import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, isAdminRole } from "@/lib/auth";

export type StaffModule =
  | "planos" | "parceiros" | "clientes" | "assinaturas" | "vendedores" | "categorias"
  | "banners" | "financeiro" | "fluxo" | "suporte" | "equipe";

export const MODULE_LABELS: Record<StaffModule, string> = {
  planos: "Planos", parceiros: "Parceiros", clientes: "Clientes", assinaturas: "Assinaturas",
  vendedores: "Vendedores", categorias: "Categorias", banners: "Banners", financeiro: "Financeiro",
  fluxo: "Fluxo de Caixa", suporte: "Suporte", equipe: "Equipe",
};

export function moduleFromPath(path: string): StaffModule | null {
  const seg = path.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  if (!seg) return null;
  if (seg === "fluxo-de-caixa") return "fluxo";
  return (seg in MODULE_LABELS ? seg : null) as StaffModule | null;
}

/** Acesso ao painel administrativo: administrador completo ou colaborador com telas liberadas. */
export function useAdminAccess() {
  const { user } = useAuth();
  const roles = useRoles();
  const staff = useQuery({
    queryKey: ["my-staff", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members").select("status, permissions").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const isAdmin = isAdminRole(roles.data);
  const perms = staff.data?.status === "ativo" ? ((staff.data.permissions ?? {}) as Record<string, string>) : {};
  return {
    loading: roles.isLoading || staff.isLoading,
    isAdmin,
    isStaff: !isAdmin && Object.keys(perms).length > 0,
    can: (m: StaffModule, edit = false) => isAdmin || perms[m] === "edit" || (!edit && perms[m] === "view"),
  };
}
