import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import { signInWithIdentifier } from "@/lib/account.functions";
import { claimSellerReferral } from "@/lib/seller.functions";
import {
  biometricAvailable,
  biometricEnroll,
  biometricEnrolled,
  biometricForget,
  biometricUnlock,
  biometricUpdateToken,
} from "@/lib/biometric";


type Search = { modo?: "login" | "cadastro"; vendedor?: string; proposta?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    modo: search["modo"] === "cadastro" ? "cadastro" : "login",
    ...(typeof search["vendedor"] === "string" ? { vendedor: search["vendedor"] } : {}),
    ...(typeof search["proposta"] === "string" ? { proposta: search["proposta"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Cartão do Bairro" },
      { name: "description", content: "Acesse sua conta do Cartão do Bairro ou crie seu cadastro." },
      { property: "og:title", content: "Entrar — Cartão do Bairro" },
      { property: "og:description", content: "Acesse sua conta do Cartão do Bairro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { modo, vendedor, proposta } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "cadastro">(modo === "cadastro" ? "cadastro" : "login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void goToAccountHome(user.id);
  }, [user, loading, navigate]);

  const [login, setLogin] = useState({ identifier: "", password: "" });
  const [useBio, setUseBio] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [signup, setSignup] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    terms: false,
  });

  async function goToAccountHome(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((item) => item.role);
    if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("financeiro")) {
      navigate({ to: "/admin" });
    } else if (roles.includes("partner")) {
      navigate({ to: "/parceiro" });
    } else if (roles.includes("seller")) {
      navigate({ to: "/vendedor" });
    } else {
      const sellerCode = localStorage.getItem("cdb_seller_code") ?? vendedor;
      const proposalToken = localStorage.getItem("cdb_proposal_token") ?? proposta;
      if (sellerCode || proposalToken) {
        try {
          await claimSellerReferral({ data: {
            ...(sellerCode ? { sellerCode } : {}),
            ...(proposalToken ? { proposalToken } : {}),
          } });
          localStorage.removeItem("cdb_seller_code");
          localStorage.removeItem("cdb_proposal_token");
        } catch (error) {
          toast.error("Não foi possível vincular sua indicação", { description: error instanceof Error ? error.message : undefined });
        }
      }
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      navigate({ to: seller ? "/vendedor" : "/app" });
    }
  }

  useEffect(() => {
    void biometricAvailable().then(setBioReady);
    setBioSaved(biometricEnrolled());
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const tokens = await signInWithIdentifier({
        data: { identifier: login.identifier, password: login.password },
      });
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) throw new Error(error.message);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (session) {
        biometricUpdateToken(session.refresh_token);
        if (useBio && !biometricEnrolled()) {
          try {
            await biometricEnroll({
              userId: session.user.id,
              label: session.user.email ?? login.identifier,
              refreshToken: session.refresh_token,
            });
            toast.success("Biometria ativada neste aparelho");
          } catch (bioError) {
            toast.error("Não foi possível ativar a biometria", {
              description: bioError instanceof Error ? bioError.message : undefined,
            });
          }
        }
      }
      toast.success("Bem-vindo de volta!");
      if (!session) throw new Error("Não foi possível identificar sua conta.");
      await goToAccountHome(session.user.id);
    } catch (error) {
      toast.error("Não foi possível entrar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleBiometricLogin() {
    setBusy(true);
    try {
      const refreshToken = await biometricUnlock();
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) throw new Error("Sua sessão expirou. Entre com a senha uma vez.");
      biometricUpdateToken(data.session.refresh_token);
      toast.success("Bem-vindo de volta!");
      await goToAccountHome(data.session.user.id);
    } catch (error) {
      biometricForget();
      setBioSaved(false);
      toast.error("Entrada por biometria indisponível", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }


  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (signup.password !== signup.confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    if (signup.password.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres");
      return;
    }
    if (!signup.terms) {
      toast.error("É necessário aceitar os termos de uso");
      return;
    }
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
           proposal_token: proposta ?? null,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    toast.success("Conta criada!", { description: "Confirme seu e-mail para ativar o acesso." });
    setTab("login");
  }

  async function handleGoogle() {
    if (vendedor) localStorage.setItem("cdb_seller_code", vendedor);
    if (proposta) localStorage.setItem("cdb_proposal_token", proposta);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha no login com Google");
      return;
    }
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
                <Label htmlFor="acesso">E-mail, CPF ou telefone</Label>
                <Input
                  id="acesso"
                  required
                  autoComplete="username"
                  value={login.identifier}
                  onChange={(e) => setLogin({ ...login, identifier: e.target.value })}
                  placeholder="voce@email.com, 000.000.000-00 ou (11) 99999-0000"
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              {bioReady && !bioSaved ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={useBio} onCheckedChange={(v) => setUseBio(v === true)} />
                  <span>Ativar entrada por biometria neste aparelho</span>
                </label>
              ) : null}
              <Button className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
              {bioSaved ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void handleBiometricLogin()}
                >
                  <Fingerprint className="mr-2 size-4" /> Entrar com biometria
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar com Google
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline"
                onClick={async () => {
                  if (!login.identifier.includes("@")) {
                    toast.error("Informe seu e-mail para recuperar a senha");
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(login.identifier, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
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
