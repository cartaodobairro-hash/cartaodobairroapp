import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CreditCard, Heart, Home, Search, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shells";

const items: NavItem[] = [
  { to: "/app", label: "Início", icon: <Home className="size-5" />, exact: true },
  { to: "/app/explorar", label: "Explorar", icon: <Search className="size-5" /> },
  { to: "/app/cartao", label: "Cartão", icon: <CreditCard className="size-5" /> },
  { to: "/app/favoritos", label: "Favoritos", icon: <Heart className="size-5" /> },
  { to: "/app/conta", label: "Conta", icon: <User className="size-5" /> },
];

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <AppShell items={items}>
      <Outlet />
    </AppShell>
  ),
});
