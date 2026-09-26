import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskCep, maskPhone } from "@/lib/format";
import { useMediaUrls } from "@/lib/media";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/parceiro/perfil")({
  head: () => ({ meta: [
    { title: "Perfil da empresa — Cartão do Bairro" },
    { name: "description", content: "Atualize os dados e a logo da sua empresa parceira." },
    { property: "og:title", content: "Perfil da empresa — Cartão do Bairro" },
    { property: "og:description", content: "Atualize os dados e a logo da sua empresa parceira." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PartnerProfile,
});

type Form = Record<string, string>;

function PartnerProfile() {
  const { data: partner } = usePartner();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { data: logoUrls } = useMediaUrls("partner-logos", [partner?.logo_url]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("status", "ativo")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const val = (key: string) => form[key] ?? ((partner as Record<string, unknown> | null)?.[key] as string) ?? "";
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      if (!partner) throw new Error("Empresa não encontrada");
      let newLogoPath: string | null = null;
      if (logoFile) {
        const ext = logoFile.type === "image/png" ? "png" : "jpg";
        newLogoPath = `${partner.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("partner-logos")
          .upload(newLogoPath, logoFile, { contentType: logoFile.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error } = await supabase.from("partners")
        .update({ ...form, ...(newLogoPath ? { logo_url: newLogoPath } : {}) } as TablesUpdate<"partners">)
        .eq("id", partner.id);
      if (error) {
        if (newLogoPath) await supabase.storage.from("partner-logos").remove([newLogoPath]);
        throw error;
      }
      if (newLogoPath && partner.logo_url?.startsWith(`${partner.id}/`)) {
        await supabase.storage.from("partner-logos").remove([partner.logo_url]);
      }
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setForm({});
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ["my-partner"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  if (!partner) {
    return (
      <div>
        <PageHeader title="Perfil da empresa" />
        <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada a esta conta.</p>
      </div>
    );
  }

  const field = (key: string, label: string, mask?: (v: string) => string) => (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={mask ? mask(val(key)) : val(key)}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Perfil da empresa"
        description={`Status: ${partner.status}`}
        action={
           <Button onClick={() => save.mutate()} disabled={(!Object.keys(form).length && !logoFile) || save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        }
      />
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-2">
        {field("trade_name", "Nome fantasia")}
        {field("company_name", "Razão social")}
        {field("phone", "Telefone", maskPhone)}
        {field("whatsapp", "WhatsApp", maskPhone)}
        {field("email", "E-mail")}
        {field("instagram", "Instagram")}
        {field("website", "Site")}
        <div>
          <Label>Categoria</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={val("category_id")}
            onChange={(e) => set("category_id", e.target.value)}
          >
            <option value="">Selecione</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {field("cep", "CEP", maskCep)}
        {field("street", "Rua")}
        {field("number", "Número")}
        {field("neighborhood", "Bairro")}
        {field("city", "Cidade")}
        {field("state", "UF")}
        {field("opening_hours", "Horário de funcionamento")}
         <div>
           <Label htmlFor="partner-logo">Logo da empresa (JPG ou PNG)</Label>
           <Input
             id="partner-logo"
             className="mt-1 h-auto py-2"
             type="file"
             accept=".jpg,.jpeg,.png,image/jpeg,image/png"
             onChange={(event) => {
               const file = event.target.files?.[0];
               if (!file) return;
               if (!["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) {
                 toast.error("Escolha uma imagem JPG ou PNG");
                 event.target.value = "";
                 return;
               }
               if (file.size > MAX_LOGO_SIZE) {
                 toast.error("A logo deve ter no máximo 5 MB");
                 event.target.value = "";
                 return;
               }
               setLogoFile(file);
             }}
           />
           {logoFile ? <p className="mt-1 text-xs text-muted-foreground">Nova logo: {logoFile.name}</p> : null}
           {partner.logo_url && logoUrls?.[partner.logo_url] ? (
             <img src={logoUrls[partner.logo_url]} alt={`Logo de ${partner.trade_name}`} className="mt-3 h-20 max-w-40 object-contain" />
           ) : null}
         </div>
        {field("cover_url", "URL da capa")}
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            rows={4}
            value={val("description")}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
