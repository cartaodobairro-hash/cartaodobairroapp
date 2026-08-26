import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
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
      toast.error(error.message);
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
        <div>
          <Label htmlFor="p1">Nova senha</Label>
          <Input id="p1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="p2">Confirmar senha</Label>
          <Input id="p2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy}>
          {busy ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
