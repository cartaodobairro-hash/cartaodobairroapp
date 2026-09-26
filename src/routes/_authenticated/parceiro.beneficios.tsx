import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import { useMediaUrls } from "@/lib/media";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/parceiro/beneficios")({
  head: () => ({ meta: [
    { title: "Benefícios do parceiro — Cartão do Bairro" },
    { name: "description", content: "Cadastre descontos e imagens de produtos da sua empresa parceira." },
    { property: "og:title", content: "Benefícios do parceiro — Cartão do Bairro" },
    { property: "og:description", content: "Cadastre descontos e imagens de produtos da sua empresa parceira." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PartnerBenefits,
});

function PartnerBenefits() {
  const { data: partner } = usePartner();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_percentage: "10",
    normal_price: "",
    discount_price: "",
    rules: "",
  });

  const { data: benefits } = useQuery({
    queryKey: ["partner-benefits", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!imageFile) { setPreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const { data: imageUrls } = useMediaUrls("benefit-images", (benefits ?? []).map((b) => b.image_url));

  const create = useMutation({
    mutationFn: async () => {
      if (!partner) throw new Error("Empresa não encontrada");
      let imagePath: string | null = null;
      if (imageFile) {
        const ext = imageFile.type === "image/png" ? "png" : "jpg";
        imagePath = `${partner.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("benefit-images").upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });
        if (error) throw error;
      }
      const { error } = await supabase.from("benefits").insert({
        partner_id: partner!.id,
        image_url: imagePath,
        title: form.title,
        description: form.description || null,
        discount_percentage: Number(form.discount_percentage || 0),
        normal_price: form.normal_price ? Number(form.normal_price) : null,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        rules: form.rules || null,
        status: "ativo",
      });
      if (error) {
        if (imagePath) await supabase.storage.from("benefit-images").remove([imagePath]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Benefício criado");
      setForm({ title: "", description: "", discount_percentage: "10", normal_price: "", discount_price: "", rules: "" });
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["partner-benefits"] });
    },
    onError: (e: Error) => toast.error("Erro ao criar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; imagePath: string | null }) => {
      const { error } = await supabase.from("benefits").delete().eq("id", id);
      if (error) throw error;
      if (imagePath) await supabase.storage.from("benefit-images").remove([imagePath]);
    },
    onSuccess: () => {
      toast.success("Benefício removido");
      queryClient.invalidateQueries({ queryKey: ["partner-benefits"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  if (!partner) return <p className="text-sm text-muted-foreground">Cadastre sua empresa primeiro.</p>;

  return (
    <div>
      <PageHeader title="Benefícios" description="Descontos oferecidos aos associados" />

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input
            className="mt-1"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="20% em todo o cardápio"
          />
        </div>
        <div>
          <Label>Desconto (%)</Label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={100}
            value={form.discount_percentage}
            onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Preço normal</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={form.normal_price}
              onChange={(e) => setForm({ ...form, normal_price: e.target.value })}
            />
          </div>
          <div>
            <Label>Com desconto</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={form.discount_price}
              onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Regras de uso</Label>
          <Input
            className="mt-1"
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            placeholder="Não cumulativo. Válido de segunda a sexta."
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="benefit-image">Imagem do produto (JPG ou PNG)</Label>
          <Input
            id="benefit-image"
            className="mt-1 h-auto py-2"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) { setImageFile(null); return; }
              if (!["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) {
                toast.error("Escolha uma imagem JPG ou PNG");
                event.target.value = "";
                setImageFile(null);
                return;
              }
              if (file.size > MAX_IMAGE_SIZE) {
                toast.error("A imagem deve ter no máximo 5 MB");
                event.target.value = "";
                setImageFile(null);
                return;
              }
              setImageFile(file);
            }}
          />
          {preview ? <img src={preview} alt="Prévia da imagem do produto" className="mt-3 h-28 w-28 rounded-md border border-border object-cover" /> : null}
        </div>
        <div className="md:col-span-2">
          <Button disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Adicionar benefício"}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-2">
        {(benefits ?? []).map((b) => (
          <div
            key={b.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex min-w-0 items-start gap-3">
              {b.image_url && imageUrls?.[b.image_url] ? (
                <img src={imageUrls[b.image_url]} alt={b.title} className="size-20 shrink-0 rounded-md object-cover" />
              ) : null}
              <div className="min-w-0">
              <p className="font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">
                {b.discount_percentage}% OFF
                {b.normal_price ? ` • de ${brl(b.normal_price)} por ${brl(b.discount_price)}` : ""}
              </p>
              {b.rules ? <p className="mt-1 text-xs text-muted-foreground">{b.rules}</p> : null}
              </div>
            </div>
            <Button size="icon" variant="ghost" title="Excluir benefício" aria-label={`Excluir ${b.title}`} disabled={remove.isPending} onClick={() => remove.mutate({ id: b.id, imagePath: b.image_url })}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!benefits?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum benefício cadastrado.</p>
        ) : null}
      </div>
    </div>
  );
}
