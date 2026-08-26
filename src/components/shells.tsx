import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export type NavItem = { to: LinkProps["to"]; label: string; icon: ReactNode; exact?: boolean };

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  };
}

/** Layout do cliente: conteúdo + menu inferior fixo. */
export function AppShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-stretch justify-between px-2">
          {items.map((item) => (
            <Link
              key={String(item.to)}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Layout dos painéis (parceiro, admin, vendedor): sidebar escura + conteúdo. */
export function PanelShell({
  title,
  items,
  children,
}: {
  title: string;
  items: NavItem[];
  children: ReactNode;
}) {
  const signOut = useSignOut();
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-sidebar p-4 md:flex">
        <div>
          <BrandLogo onDark className="mb-1" />
          <p className="mb-6 pl-11 text-[11px] font-semibold uppercase tracking-widest text-primary">
            {title}
          </p>
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                key={String(item.to)}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <Button variant="ghost" onClick={signOut} className="justify-start text-sidebar-foreground/70">
          <LogOut className="size-4" /> Sair
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <BrandLogo />
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={String(item.to)}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground",
              )}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "brand" | "ink";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-card",
        tone === "brand" && "surface-brand border-transparent",
        tone === "ink" && "surface-ink border-transparent",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          tone === "default" ? "text-muted-foreground" : "opacity-80",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint ? (
        <p className={cn("text-xs", tone === "default" ? "text-muted-foreground" : "opacity-75")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
