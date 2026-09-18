import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, CircleDollarSign, LayoutDashboard, Link2, QrCode, ShoppingBag, Target, TrendingUp, UserRound, Users } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/vendedor", label: "Dashboard", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/vendedor/nova-venda", label: "Nova venda", icon: <ShoppingBag className="size-4" /> },
  { to: "/vendedor/leads", label: "Meus clientes", icon: <Users className="size-4" /> },
  { to: "/vendedor/comissoes", label: "Comissões", icon: <CircleDollarSign className="size-4" /> },
  { to: "/vendedor/vendas", label: "Minhas vendas", icon: <TrendingUp className="size-4" /> },
  { to: "/vendedor/metas", label: "Metas", icon: <Target className="size-4" /> },
  { to: "/vendedor/link", label: "Meu link", icon: <Link2 className="size-4" /> },
  { to: "/vendedor/qr-code", label: "Meu QR Code", icon: <QrCode className="size-4" /> },
  { to: "/vendedor/notificacoes", label: "Notificações", icon: <Bell className="size-4" /> },
  { to: "/vendedor/perfil", label: "Meu perfil", icon: <UserRound className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/vendedor")({
  component: () => (
    <PanelShell title="Vendedor" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
