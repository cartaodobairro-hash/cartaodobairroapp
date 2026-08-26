import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/vendedor", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/vendedor/leads", label: "Leads", icon: <Users className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/vendedor")({
  component: () => (
    <PanelShell title="Vendedor" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
