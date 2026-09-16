import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Plus, Trash2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shells";
import { brl } from "@/lib/format";
import { createSellerAccount, deleteSellerAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  component: AdminSellers,
});

function AdminSellers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string; sellerCode: string } | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", sellerCode: "", cpf: "", phone: "", whatsapp: "", city: "", neighborhood: "", commissionValue: "10", goal: "50" });
  const { data: sellers } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*, seller_sales(amount, commission_amount)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createSellerAccount({ data: {
      ...form,
      password: form.password || undefined,
      commissionValue: Number(form.commissionValue),
      goal: Number(form.goal),
    } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      setOpen(false);
      setCredentials(result);
      setForm({ name: "", email: "", password: "", sellerCode: "", cpf: "", phone: "", whatsapp: "", city: "", neighborhood: "", commissionValue: "10", goal: "50" });
      toast.success("Vendedor cadastrado e login criado");
    },
    onError: (error: Error) => toast.error("Não foi possível cadastrar", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (sellerId: string) => deleteSellerAccount({ data: { sellerId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      setSellerToDelete(null);
      toast.success("Vendedor excluído");
    },
    onError: (error: Error) => toast.error("Não foi possível excluir", { description: error.message }),
  });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const field = (label: string, name: keyof typeof form, type = "text", placeholder?: string) => (
    <div className="space-y-1.5"><Label htmlFor={`seller-${name}`}>{label}</Label><Input id={`seller-${name}`} type={type} placeholder={placeholder} value={form[name]} onChange={(event) => update(name, event.target.value)} /></div>
  );

  return (
    <div>
      <PageHeader
        title="Vendedores"
        description="Equipe de vendas, comissões e acessos"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Novo vendedor</Button>}
      />
      <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3"><UserRoundPlus className="mt-0.5 size-5 text-primary" /><p><strong className="text-foreground">Crie o acesso do vendedor</strong><br />O cadastro gera a conta de login e vincula automaticamente o vendedor ao painel de vendas.</p></div>
      </div>
      <div className="space-y-2">
        {(sellers ?? []).map((s) => {
          const sales = s.seller_sales ?? [];
          const total = sales.reduce((acc, v) => acc + Number(v.amount ?? 0), 0);
          const commission = sales.reduce((acc, v) => acc + Number(v.commission_amount ?? 0), 0);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  Código {s.seller_code} • {[s.neighborhood, s.city].filter(Boolean).join(" - ")}
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Vendas</span>
                  {sales.length}
                </span>
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Valor</span>
                  {brl(total)}
                </span>
                <span>
                  <span className="block text-[11px] uppercase text-muted-foreground">Comissão</span>
                  {brl(commission)}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`Excluir vendedor ${s.name}`}
                  onClick={() => setSellerToDelete({ id: s.id, name: s.name })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {!sellers?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado.</p>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Novo vendedor</DialogTitle><DialogDescription>Preencha os dados para criar o cadastro e o acesso ao painel.</DialogDescription></DialogHeader>
          <form id="seller-form" className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
            <div className="sm:col-span-2">{field("Nome completo *", "name", "text", "Nome do vendedor")}</div>
            {field("E-mail de login *", "email", "email", "vendedor@exemplo.com")}
            {field("Senha (opcional)", "password", "password", "Será gerada se ficar vazia")}
            {field("Código de vendedor", "sellerCode", "text", "Gerado automaticamente se vazio")}
            {field("CPF", "cpf", "text", "000.000.000-00")}
            {field("Telefone", "phone")}
            {field("WhatsApp", "whatsapp")}
            {field("Cidade", "city")}
            {field("Bairro", "neighborhood")}
            {field("Comissão (%)", "commissionValue", "number", "10")}
            {field("Meta mensal (vendas)", "goal", "number", "50")}
          </form>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="seller-form" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando acesso..." : "Cadastrar vendedor"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(credentials)} onOpenChange={(value) => !value && setCredentials(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Login criado com sucesso</DialogTitle><DialogDescription>Entregue estes dados ao vendedor. A senha não será exibida novamente.</DialogDescription></DialogHeader>
          {credentials ? <div className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm"><p><span className="block text-xs text-muted-foreground">E-mail</span><strong>{credentials.email}</strong></p><p><span className="block text-xs text-muted-foreground">Senha provisória</span><strong className="font-mono">{credentials.password}</strong></p><p><span className="block text-xs text-muted-foreground">Código de vendedor</span><strong>{credentials.sellerCode}</strong></p></div> : null}
          <DialogFooter><Button onClick={() => setCredentials(null)}><KeyRound className="mr-2 size-4" />Concluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(sellerToDelete)} onOpenChange={(value) => !value && setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              {sellerToDelete ? `O cadastro de ${sellerToDelete.name}, seus dados de vendas e o login vinculado serão excluídos. Essa ação não pode ser desfeita.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (sellerToDelete) deleteMutation.mutate(sellerToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir vendedor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
