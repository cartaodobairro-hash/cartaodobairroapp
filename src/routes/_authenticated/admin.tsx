import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  Images,
  LayoutDashboard,
  ChartNoAxesCombined,
  LifeBuoy,
  ReceiptText,
  ShieldCheck,
  Tags,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";
import { moduleFromPath, useAdminAccess, type StaffModule } from "@/lib/staff-access";

const items: (NavItem & { module?: StaffModule })[] = [
  { to: "/admin", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/admin/planos", label: "Planos", icon: <CreditCard className="size-4" />, module: "planos" },
  { to: "/admin/parceiros", label: "Parceiros", icon: <Building2 className="size-4" />, module: "parceiros" },
  { to: "/admin/clientes", label: "Clientes", icon: <Users className="size-4" />, module: "clientes" },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: <ReceiptText className="size-4" />, module: "assinaturas" },
  { to: "/admin/vendedores", label: "Vendedores", icon: <UserRound className="size-4" />, module: "vendedores" },
  { to: "/admin/categorias", label: "Categorias", icon: <Tags className="size-4" />, module: "categorias" },
  { to: "/admin/banners", label: "Banners", icon: <Images className="size-4" />, module: "banners" },
  { to: "/admin/financeiro", label: "Financeiro", icon: <Wallet className="size-4" />, module: "financeiro" },
  {
    to: "/admin/fluxo-de-caixa",
    label: "Fluxo de Caixa",
    icon: <ChartNoAxesCombined className="size-4" />,
    module: "fluxo",
  },
  { to: "/admin/suporte", label: "Suporte", icon: <LifeBuoy className="size-4" />, module: "suporte" },
  { to: "/admin/equipe", label: "Equipe", icon: <ShieldCheck className="size-4" />, module: "equipe" },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const access = useAdminAccess();
  const { pathname } = useLocation();
  const current = moduleFromPath(pathname);
  const visible = items.filter((i) => !i.module || access.can(i.module));
  const blocked = !access.loading && (current ? !access.can(current) : !access.isAdmin && !access.isStaff);

  return (
    <PanelShell title="Administração" items={visible}>
      {access.loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : blocked ? (
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta área.</p>
      ) : (
        <Outlet />
      )}
    </PanelShell>
  );
}
