import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Heart, Home, Lock, MessageCircle, Search, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shells";
import { supabase } from "@/integrations/supabase/client";
import { isAdminRole, useAuth, useRoles } from "@/lib/auth";
import { customerAccess, OPEN_APP_PATHS } from "@/lib/customer-access";
import { Button } from "@/components/ui/button";

const items: NavItem[] = [
  { to: "/app", label: "Início", icon: <Home className="size-5" />, exact: true },
  { to: "/app/explorar", label: "Explorar", icon: <Search className="size-5" /> },
  { to: "/app/cartao", label: "Cartão", icon: <CreditCard className="size-5" /> },
  { to: "/app/favoritos", label: "Favoritos", icon: <Heart className="size-5" /> },
  { to: "/app/conta", label: "Conta", icon: <User className="size-5" /> },
];

export const Route = createFileRoute("/_authenticated/app")({
  staticData: { sitemap: false },
  component: AppLayout,
});

function AppLayout() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { pathname } = useLocation();
  const { data: access, isLoading } = useQuery({
    queryKey: ["customer-access", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("status, subscriptions(status, next_due_date, created_at), payments(status)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return "liberado" as const;
      return customerAccess(
        data.status,
        data.subscriptions ?? [],
        (data.payments ?? []).some((p) => p.status === "pago"),
      );
    },
  });

  const open = OPEN_APP_PATHS.some((p) => pathname.startsWith(p));
  const exempt = isAdminRole(roles);
  let content = <Outlet />;
  if (!exempt && !open) {
    if (isLoading || rolesLoading) content = <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
    else if (access === "escolher_plano") return <Navigate to="/app/planos" />;
    else if (access === "suspenso") content = <Suspended />;
  }

  return <AppShell items={items}>{content}</AppShell>;
}

function Suspended() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-7" />
        </div>
        <h1 className="text-xl font-extrabold">Acesso suspenso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu acesso ao aplicativo e à carteirinha está suspenso por pendência de pagamento. Regularize para voltar a
          usar seus benefícios.
        </p>
        <div className="mt-6 space-y-2">
          <Button asChild className="w-full">
            <Link to="/app/pagamento">Regularizar pagamento</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/app/suporte">
              <MessageCircle className="mr-2 size-4" /> Falar com o suporte
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
