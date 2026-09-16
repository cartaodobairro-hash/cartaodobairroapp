import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Copy, KeyRound, Plus, UserRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSellerAccount } from "@/lib/admin.functions";
import { isAdminRole, useRoles } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type SellerStatus = Database["public"]["Enums"]["generic_status"];
type SellerForm = {
  name: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
  city: string;
  neighborhood: string;
  sellerCode: string;
  commissionType: "percentual" | "fixa";
  commissionValue: string;
  goal: string;
};

const emptyForm: SellerForm = {
  name: "",
  email: "",
  password: "",
  cpf: "",
  phone: "",
  city: "",
  neighborhood: "",
  sellerCode: "",
  commissionType: "percentual",
  commissionValue: "10",
  goal: "50",
};

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  component: AdminSellers,
});

function AdminSellers() {
  const queryClient = useQueryClient();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; code: string } | null>(null);

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*, seller_sales(amount, commission_amount, status), seller_commissions(amount, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      createSellerAccount({
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          cpf: onlyDigits(form.cpf) || undefined,
          phone: onlyDigits(form.phone) || undefined,
          city: form.city,
          neighborhood: form.neighborhood,
          sellerCode: form.sellerCode || undefined,
          commissionType: form.commissionType,
          commissionValue: Number(form.commissionValue.replace(",", ".")),
          goal: Number(form.goal),
        },
      }),
    onSuccess: ({ seller }) => {
      setCreatedLogin({ email: form.email, password: form.password, code: seller.seller_code });
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Vendedor cadastrado e acesso criado");
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error("Não foi possível cadastrar", { description: error.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SellerStatus }) => {
      const { error } = await supabase.from("sellers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status do vendedor atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
    },
    onError: (error: Error) => toast.error("Não foi possível atualizar", { description: error.message }),
  });

  const rows = sellers ?? [];
  const totalSales = rows.reduce((sum, seller) => sum + (seller.seller_sales?.length ?? 0), 0);
  const totalRevenue = rows.reduce(
    (sum, seller) => sum + (seller.seller_sales ?? []).reduce((value, sale) => value + Number(sale.amount ?? 0), 0),
    0,
  );
  const pendingCommissions = rows.reduce(
    (sum, seller) =>
      sum +
      (seller.seller_commissions ?? [])
        .filter((commission) => !["paga", "cancelada", "estornada"].includes(commission.status))
        .reduce((value, commission) => value + Number(commission.amount ?? 0), 0),
    0,
  );
  const activeSellers = rows.filter((seller) => seller.status === "ativo").length;

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Carregando permissões...</p>;
  if (!isAdminRole(roles)) {
    return <p className="text-sm text-muted-foreground">Você não tem permissão para gerenciar vendedores.</p>;
  }

  function setField<K extends keyof SellerForm>(field: K, value: SellerForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function copyLogin() {
    if (!createdLogin) return;
    await navigator.clipboard.writeText(
      `Login: ${createdLogin.email}\nSenha inicial: ${createdLogin.password}\nCódigo: ${createdLogin.code}`,
    );
    toast.success("Dados de acesso copiados");
  }

  return (
    <div>
      <PageHeader
        title="Vendedores"
        description="Cadastre acessos, acompanhe resultados e controle o comissionamento"
        action={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus /> {showForm ? "Fechar cadastro" : "Novo vendedor"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendedores ativos" value={activeSellers} tone="brand" />
        <StatCard label="Vendas registradas" value={totalSales} />
        <StatCard label="Valor vendido" value={brl(totalRevenue)} />
        <StatCard label="Comissões em aberto" value={brl(pendingCommissions)} tone="ink" />
      </div>

      {createdLogin ? (
        <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-semibold">Acesso criado com sucesso</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entregue estes dados ao vendedor. A senha inicial não será exibida novamente nesta tela.
                </p>
                <p className="mt-3 text-sm"><strong>Login:</strong> {createdLogin.email}</p>
                <p className="text-sm"><strong>Senha inicial:</strong> {createdLogin.password}</p>
                <p className="text-sm"><strong>Código:</strong> {createdLogin.code}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyLogin}><Copy /> Copiar acesso</Button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form
          className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            <div>
              <h2 className="font-bold">Cadastro administrativo</h2>
              <p className="text-xs text-muted-foreground">Somente administradores podem criar o login do vendedor.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2"><Label>Nome completo</Label><Input className="mt-1" required value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
            <div className="lg:col-span-2"><Label>E-mail de acesso</Label><Input className="mt-1" required type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
            <div><Label>Senha inicial</Label><Input className="mt-1" required minLength={6} type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} /></div>
            <div><Label>CPF</Label><Input className="mt-1" value={form.cpf} onChange={(e) => setField("cpf", maskCpf(e.target.value))} /></div>
            <div><Label>Telefone / WhatsApp</Label><Input className="mt-1" value={form.phone} onChange={(e) => setField("phone", maskPhone(e.target.value))} /></div>
            <div><Label>Cidade</Label><Input className="mt-1" value={form.city} onChange={(e) => setField("city", e.target.value)} /></div>
            <div><Label>Bairro</Label><Input className="mt-1" value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} /></div>
            <div><Label>Código de indicação <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input className="mt-1" placeholder="Gerado automaticamente" value={form.sellerCode} onChange={(e) => setField("sellerCode", e.target.value.toUpperCase())} /></div>
            <div><Label>Tipo de comissão</Label><select className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.commissionType} onChange={(e) => setField("commissionType", e.target.value as SellerForm["commissionType"])}><option value="percentual">Percentual (%)</option><option value="fixa">Valor fixo (R$)</option></select></div>
            <div><Label>{form.commissionType === "percentual" ? "Comissão (%)" : "Comissão (R$)"}</Label><Input className="mt-1" required min={0} step="0.01" type="number" value={form.commissionValue} onChange={(e) => setField("commissionValue", e.target.value)} /></div>
            <div><Label>Meta mensal de vendas</Label><Input className="mt-1" required min={0} step={1} type="number" value={form.goal} onChange={(e) => setField("goal", e.target.value)} /></div>
          </div>
          <div className="mt-4 flex justify-end"><Button type="submit" disabled={create.isPending}><KeyRound /> {create.isPending ? "Criando acesso..." : "Criar vendedor e login"}</Button></div>
        </form>
      ) : null}

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando vendedores...</p> : null}
        {rows.map((seller) => {
          const sales = seller.seller_sales ?? [];
          const commissions = seller.seller_commissions ?? [];
          const total = sales.reduce((sum, sale) => sum + Number(sale.amount ?? 0), 0);
          const commission = commissions.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
          const paid = commissions.filter((item) => item.status === "paga").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
          return (
            <div key={seller.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="size-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.email ?? "Sem e-mail"} • Código {seller.seller_code}</p>
                    <p className="text-xs text-muted-foreground">{[seller.neighborhood, seller.city].filter(Boolean).join(" - ") || "Localização não informada"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${seller.status === "ativo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{seller.status}</span>
                  <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: seller.id, status: seller.status === "ativo" ? "inativo" : "ativo" })}>
                    {seller.status === "ativo" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-4">
                <div><p className="text-[11px] uppercase text-muted-foreground">Vendas</p><p className="font-semibold">{sales.length}</p><p className="text-xs text-muted-foreground">{brl(total)}</p></div>
                <div><p className="text-[11px] uppercase text-muted-foreground">Comissão gerada</p><p className="font-semibold">{brl(commission)}</p></div>
                <div><p className="text-[11px] uppercase text-muted-foreground">Comissão paga</p><p className="font-semibold text-primary">{brl(paid)}</p></div>
                <div><p className="text-[11px] uppercase text-muted-foreground">Regra / meta</p><p className="font-semibold">{seller.commission_type === "percentual" ? `${seller.commission_value}%` : brl(seller.commission_value)}</p><p className="text-xs text-muted-foreground">{seller.goal} vendas / mês</p></div>
              </div>
            </div>
          );
        })}
        {!isLoading && !rows.length ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum vendedor cadastrado.</p></div> : null}
      </div>
    </div>
  );
}
