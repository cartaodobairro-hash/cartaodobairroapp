import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { maskCpf, maskPhone, onlyDigits } from "@/lib/format";

type Search = { modo?: "login" | "cadastro"; vendedor?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    modo: search.modo === "cadastro" ? "cadastro" : "login",
    vendedor: typeof search.vendedor === "string" ? search.vendedor : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Cartão do Bairro" },
      { name: "description", content: "Acesse sua conta do Cartão do Bairro ou crie seu cadastro." },
      { property: "og:title", content: "Entrar — Cartão do Bairro" },
      { property: "og:description", content: "Acesse sua conta do Cartão do Bairro." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { modo, vendedor } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "cadastro">(modo === "cadastro" ? "cadastro" : "login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [user, loading, navigate]);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    terms: false,
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: login.email.trim(),
      password: login.password,
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/app" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (signup.password !== signup.confirm) return toast.error("As senhas não conferem");
    if (signup.password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres");
    if (!signup.terms) return toast.error("É necessário aceitar os termos de uso");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signup.email.trim(),
      password: signup.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: signup.name,
          cpf: onlyDigits(signup.cpf),
          phone: onlyDigits(signup.phone),
          seller_code: vendedor ?? null,
        },
      },
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível criar a conta", { description: error.message });
    if (vendedor) localStorage.setItem("cdb_seller_code", vendedor);
    toast.success("Conta criada!", { description: "Confirme seu e-mail para ativar o acesso." });
    setTab("login");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Falha no login com Google");
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between surface-ink p-10 lg:flex">
        <BrandLogo onDark />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Benefícios que fortalecem
            <span className="block text-primary">o seu bairro.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-70">
            Entrou. Encontrou. Economizou. Descontos reais em empresas parceiras pertinho de casa.
          </p>
        </div>
        <p className="text-xs opacity-50">© {new Date().getFullYear()} Cartão do Bairro</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <BrandLogo className="mb-6" />
          </div>

          {vendedor ? (
            <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
              Indicação do vendedor <strong>{vendedor}</strong>
            </p>
          ) : null}

          <div className="mb-6 flex rounded-xl bg-muted p-1">
            {(["login", "cadastro"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  tab === t ? "bg-card text-foreground shadow-card" : "text-muted-foreground"
                }`}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={login.email}
                  onChange={(e) => setLogin({ ...login, email: e.target.value })}
                  placeholder="voce@email.com"
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar com Google
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline"
                onClick={async () => {
                  if (!login.email) return toast.error("Informe seu e-mail primeiro");
                  const { error } = await supabase.auth.resetPasswordForEmail(login.email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) return toast.error(error.message);
                  toast.success("Enviamos um link de recuperação para seu e-mail");
                }}
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  required
                  value={signup.name}
                  onChange={(e) => setSignup({ ...signup, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    required
                    value={signup.cpf}
                    onChange={(e) => setSignup({ ...signup, cpf: maskCpf(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="tel">Celular</Label>
                  <Input
                    id="tel"
                    required
                    value={signup.phone}
                    onChange={(e) => setSignup({ ...signup, phone: maskPhone(e.target.value) })}
                    placeholder="(11) 99999-0000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email2">E-mail</Label>
                <Input
                  id="email2"
                  type="email"
                  required
                  value={signup.email}
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="s1">Senha</Label>
                  <Input
                    id="s1"
                    type="password"
                    required
                    value={signup.password}
                    onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="s2">Confirmar</Label>
                  <Input
                    id="s2"
                    type="password"
                    required
                    value={signup.confirm}
                    onChange={(e) => setSignup({ ...signup, confirm: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                <Checkbox
                  checked={signup.terms}
                  onCheckedChange={(v) => setSignup({ ...signup, terms: v === true })}
                />
                <span>
                  Li e concordo com os{" "}
                  <Link to="/termos" className="underline">
                    termos de uso
                  </Link>{" "}
                  e a{" "}
                  <Link to="/privacidade" className="underline">
                    política de privacidade
                  </Link>
                  .
                </span>
              </label>
              <Button className="w-full" disabled={busy}>
                {busy ? "Criando conta..." : "Criar minha conta"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
