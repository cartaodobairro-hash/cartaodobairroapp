import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BadgePercent, CreditCard, Sparkles, BarChart3, LayoutDashboard, QrCode, ShoppingBag, Store, Users } from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/parceiro", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/parceiro/beneficios", label: "Benefícios", icon: <BadgePercent className="size-4" /> },
  { to: "/parceiro/validar", label: "Validar", icon: <QrCode className="size-4" /> },
  { to: "/parceiro/vendas", label: "Vendas", icon: <ShoppingBag className="size-4" /> },
  { to: "/parceiro/relatorios", label: "Relatórios", icon: <BarChart3 className="size-4" /> },
  { to: "/parceiro/equipe", label: "Equipe", icon: <Users className="size-4" /> },
  { to: "/parceiro/perfil", label: "Perfil", icon: <Store className="size-4" /> },
  { to: "/app/planos", label: "Meu plano", icon: <Sparkles className="size-4" /> },
  { to: "/app/cartao", label: "Minha carteirinha", icon: <CreditCard className="size-4" /> },
];

export const Route = createFileRoute("/_authenticated/parceiro")({
  staticData: { sitemap: false },
  component: () => (
    <PanelShell title="Parceiro" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
