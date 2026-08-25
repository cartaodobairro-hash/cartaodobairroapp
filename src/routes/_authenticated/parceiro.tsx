import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BadgePercent, LayoutDashboard, QrCode } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/parceiro", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/parceiro/beneficios", label: "Benefícios", icon: <BadgePercent className="size-4" /> },
  { to: "/parceiro/validar", label: "Validar", icon: <QrCode className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/parceiro")({
  component: () => (
    <PanelShell title="Parceiro" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
