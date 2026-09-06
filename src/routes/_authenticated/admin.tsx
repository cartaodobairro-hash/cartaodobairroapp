import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Tags,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { PanelShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/admin", label: "Resumo", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/admin/planos", label: "Planos", icon: <CreditCard className="size-4" /> },
  { to: "/admin/parceiros", label: "Parceiros", icon: <Building2 className="size-4" /> },
  { to: "/admin/clientes", label: "Clientes", icon: <Users className="size-4" /> },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: <ReceiptText className="size-4" /> },
  { to: "/admin/vendedores", label: "Vendedores", icon: <UserRound className="size-4" /> },
  { to: "/admin/categorias", label: "Categorias", icon: <Tags className="size-4" /> },
  { to: "/admin/banners", label: "Banners", icon: <Images className="size-4" /> },
  { to: "/admin/financeiro", label: "Financeiro", icon: <Wallet className="size-4" /> },
  { to: "/admin/suporte", label: "Suporte", icon: <LifeBuoy className="size-4" /> },
];


export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <PanelShell title="Administração" items={items}>
      <Outlet />
    </PanelShell>
  ),
});
