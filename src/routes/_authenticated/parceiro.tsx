import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BadgePercent, BarChart3, LayoutDashboard, QrCode, Store, Users } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/parceiro", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/parceiro/beneficios", label: "Benefícios", icon: <BadgePercent className="size-4" /> },
  { to: "/parceiro/validar", label: "Validar", icon: <QrCode className="size-4" /> },
  { to: "/parceiro/relatorios", label: "Relatórios", icon: <BarChart3 className="size-4" /> },
  { to: "/parceiro/equipe", label: "Equipe", icon: <Users className="size-4" /> },
  { to: "/parceiro/perfil", label: "Perfil", icon: <Store className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/parceiro")({
  component: () => (
    <PanelShell title="Parceiro" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
