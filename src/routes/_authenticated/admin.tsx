import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Users, UserRound } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/admin", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/admin/parceiros", label: "Parceiros", icon: <Building2 className="size-4" /> },
  { to: "/admin/clientes", label: "Clientes", icon: <Users className="size-4" /> },
  { to: "/admin/vendedores", label: "Vendedores", icon: <UserRound className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <PanelShell title="Administração" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
