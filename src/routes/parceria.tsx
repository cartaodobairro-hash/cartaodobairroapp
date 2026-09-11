import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { maskCnpj, maskPhone, onlyDigits } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/parceria")({
  head: () => ({
    meta: [
      { title: "Seja parceiro — Cartão do Bairro" },
      {
        name: "description",
        content:
          "Cadastre sua empresa no Cartão do Bairro, ofereça benefícios e receba novos clientes do seu bairro.",
      },
      { property: "og:title", content: "Seja parceiro — Cartão do Bairro" },
      { property: "og:description", content: "Cadastre sua empresa e receba clientes do bairro." },
    ],
  }),
  component: PartnerSignup,
});

function PartnerSignup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"empresa" | "acesso">("empresa");
  const [access, setAccess] = useState({ email: "", password: "", confirm: "", terms: false });
  const [form, setForm] = useState({
    company_name: "",
    trade_name: "",
    cnpj: "",
    category_id: "",
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
    description: "",
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.trade_name.trim() || !form.category_id) {
      setTab("empresa");
      toast.error("Preencha os dados obrigatórios da empresa");
      return;
    }
    if (!user) {
      if (!access.email.trim() || access.password.length < 6) {
        setTab("acesso");
        toast.error("Informe um e-mail válido e uma senha com pelo menos 6 caracteres");
        return;
      }
      if (access.password !== access.confirm) {
        setTab("acesso");
        toast.error("As senhas não conferem");
        return;
      }
      if (!access.terms) {
        setTab("acesso");
        toast.error("É necessário aceitar os termos de uso");
        return;
      }
    }
    setBusy(true);
    let error: Error | null = null;
    let accountCreated = false;

    if (user) {
      const result = await supabase.from("partners").insert({
        ...form,
        email: form.email.trim() || user.email || null,
        category_id: form.category_id,
        user_id: user.id,
        status: "pendente",
      });
      error = result.error;
    } else {
      const result = await supabase.auth.signUp({
        email: access.email.trim(),
        password: access.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?modo=login`,
          data: {
            role: "partner",
            name: form.trade_name.trim(),
            trade_name: form.trade_name.trim(),
            phone: onlyDigits(form.phone),
            partner_company_name: form.company_name.trim(),
            partner_cnpj: onlyDigits(form.cnpj),
            partner_category_id: form.category_id,
            partner_whatsapp: onlyDigits(form.whatsapp),
            partner_city: form.city.trim(),
            partner_neighborhood: form.neighborhood.trim(),
            partner_street: form.street.trim(),
            partner_number: form.number.trim(),
            partner_description: form.description.trim(),
          },
        },
      });
      error = result.error;
      accountCreated = !result.error;
    }
    setBusy(false);
    if (error) return toast.error("Não foi possível enviar", { description: error.message });
    if (accountCreated) {
      toast.success("Cadastro enviado!", {
        description: "Confirme seu e-mail e entre para acompanhar a análise.",
      });
      navigate({ to: "/auth", search: { modo: "login" } });
      return;
    }
    toast.success("Cadastro enviado!", { description: "Sua empresa está em análise." });
    navigate({ to: "/parceiro" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <Link to="/">
          <BrandLogo />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Seja uma empresa parceira</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ofereça descontos para os associados e apareça no mapa, na busca e nos destaques do
          aplicativo. Sem mensalidade: você só oferece o benefício combinado.
        </p>

        <form onSubmit={submit} className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Button type="button" variant={tab === "empresa" ? "default" : "ghost"} onClick={() => setTab("empresa")}>
              <Building2 className="size-4" /> Empresa
            </Button>
            <Button type="button" variant={tab === "acesso" ? "default" : "ghost"} onClick={() => setTab("acesso")}>
              <KeyRound className="size-4" /> Acesso
            </Button>
          </div>

          {tab === "empresa" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razão social" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} required />
              <Field label="Nome fantasia" value={form.trade_name} onChange={(v) => setForm({ ...form, trade_name: v })} required />
              <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: maskCnpj(v) })} />
              <div>
                <Label>Categoria</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                  <option value="">Selecione</option>
                  {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: maskPhone(v) })} />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: maskPhone(v) })} />
              <Field label="E-mail comercial" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Bairro" value={form.neighborhood} onChange={(v) => setForm({ ...form, neighborhood: v })} />
              <Field label="Rua" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
              <Field label="Número" value={form.number} onChange={(v) => setForm({ ...form, number: v })} />
              <div className="md:col-span-2">
                <Label>Descrição da empresa</Label>
                <Textarea className="mt-1" rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Conte o que sua empresa oferece e qual benefício pretende dar aos associados." />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="button" onClick={() => setTab("acesso")}>Continuar para acesso</Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-4">
              {user ? (
                <div className="rounded-lg border border-border bg-background p-4 text-sm">
                  Este cadastro será vinculado à conta <strong>{user.email}</strong>.
                </div>
              ) : (
                <>
                  <Field label="E-mail para entrar" type="email" autoComplete="email" value={access.email} onChange={(v) => setAccess({ ...access, email: v })} required />
                  <Field label="Crie uma senha" type="password" autoComplete="new-password" minLength={6} value={access.password} onChange={(v) => setAccess({ ...access, password: v })} required />
                  <Field label="Confirme a senha" type="password" autoComplete="new-password" minLength={6} value={access.confirm} onChange={(v) => setAccess({ ...access, confirm: v })} required />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={access.terms} onCheckedChange={(v) => setAccess({ ...access, terms: v === true })} />
                    <span>Li e concordo com os <Link to="/termos" className="underline">termos de uso</Link> e a <Link to="/privacidade" className="underline">política de privacidade</Link>.</span>
                  </label>
                </>
              )}
              <Button disabled={busy} className="w-full">
                {busy ? "Criando acesso..." : "Criar acesso e enviar para análise"}
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" type={type} autoComplete={autoComplete} minLength={minLength} maxLength={255} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
