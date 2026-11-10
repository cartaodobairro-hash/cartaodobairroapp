import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { registrationError } from "@/lib/registration";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { title: "Nova senha — Cartão do Bairro" },
      { name: "description", content: "Defina uma nova senha para sua conta do Cartão do Bairro." },
      { property: "og:title", content: "Nova senha — Cartão do Bairro" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setHasSession(true);
    });
    // dá tempo para o link de recuperação criar a sessão
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    if (password.length < 6) {
      toast.error("Mínimo de 6 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(
        /session|jwt|auth/i.test(error.message) && !/password/i.test(error.message)
          ? "Seu link expirou. Peça um novo link em \"Esqueci minha senha\"."
          : error.code === "same_password"
            ? "A nova senha precisa ser diferente da anterior."
            : registrationError(error),
      );
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <BrandLogo className="mb-4" />
        <h1 className="text-2xl font-extrabold tracking-tight">Definir nova senha</h1>
        {hasSession === false && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Link inválido ou expirado. Volte ao login, toque em "Esqueci minha senha" e abra o link mais recente enviado ao seu e-mail.
          </p>
        )}
        <div>
          <Label htmlFor="p1">Nova senha</Label>
          <PasswordInput id="p1" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="p2">Confirmar senha</Label>
          <PasswordInput id="p2" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy}>
          {busy ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
