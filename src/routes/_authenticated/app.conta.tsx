import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCustomer, useProfile, useRoles, useSeller, isAdminRole } from "@/lib/auth";
import { PageHeader, useSignOut } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, dateBR, maskPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/conta")({
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: customer } = useCustomer();
  const { data: roles } = useRoles();
  const { data: seller } = useSeller();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ name?: string; phone?: string } | null>(null);

  const values = {
    name: form?.name ?? profile?.name ?? "",
    phone: form?.phone ?? profile?.phone ?? "",
  };

  const { data: payments } = useQuery({
    queryKey: ["payments", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: values.name, phone: values.phone })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Dados atualizados");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Minha conta" description="Dados pessoais, plano e pagamentos" />

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div>
          <Label>Nome</Label>
          <Input
            className="mt-1"
            value={values.name}
            onChange={(e) => setForm({ ...values, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Celular</Label>
          <Input
            className="mt-1"
            value={maskPhone(values.phone)}
            onChange={(e) => setForm({ ...values, phone: e.target.value })}
          />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input className="mt-1" value={profile?.email ?? user?.email ?? ""} disabled />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold">Assinatura</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {customer?.plans
            ? `${customer.plans.name} • ${brl(customer.plans.price)} / ${customer.plans.period}`
            : "Nenhum plano ativo no momento."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/app/planos">{customer?.plans ? "Trocar de plano" : "Escolher plano"}</Link>
          </Button>
          {customer?.plan_id ? (
            <Button asChild size="sm"><Link to="/app/pagamento">Pagar mensalidade</Link></Button>
          ) : null}
          {(customer?.plans?.max_dependents ?? 0) > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/app/dependentes">Dependentes</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold">Últimos pagamentos</h2>
        <div className="mt-2 space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{dateBR(p.paid_at ?? p.created_at)}</span>
              <span className="font-semibold">{brl(p.amount)}</span>
              <span className="text-xs uppercase text-muted-foreground">{p.status}</span>
            </div>
          ))}
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/app/notificacoes">Notificações</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/suporte">Suporte</Link>
        </Button>
        {isAdminRole(roles) ? (
          <Button asChild variant="outline">
            <Link to="/admin">Painel administrativo</Link>
          </Button>
        ) : null}
        {roles?.includes("partner") ? (
          <Button asChild variant="outline">
            <Link to="/parceiro">Painel do parceiro</Link>
          </Button>
        ) : null}
        {roles?.includes("seller") || seller ? (
          <Button asChild variant="outline">
            <Link to="/vendedor">Painel do vendedor</Link>
          </Button>
        ) : null}
      </div>

      <Button variant="ghost" className="mt-4 text-destructive" onClick={signOut}>
        <LogOut className="size-4" /> Sair da conta
      </Button>

      <p className="mt-6 pb-4 text-center text-xs text-muted-foreground">
        <Link to="/termos" className="underline">
          Termos
        </Link>{" "}
        •{" "}
        <Link to="/privacidade" className="underline">
          Privacidade
        </Link>
      </p>
    </div>
  );
}
