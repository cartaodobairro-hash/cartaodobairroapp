import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/shells";
import { useMediaUrls, removeMedia, uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: AdminBanners,
});

type Form = {
  title: string;
  subtitle: string;
  link: string;
  type: string;
  city: string;
};

const emptyForm: Form = { title: "", subtitle: "", link: "", type: "banner", city: "" };

function AdminBanners() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: media } = useMediaUrls("banners", (banners ?? []).map((b) => b.image_url));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Escolha uma imagem ou vídeo");
      const path = await uploadMedia("banners", file);
      const { error } = await supabase.from("banners").insert({
        title: form.title,
        subtitle: form.subtitle || null,
        link: form.link || null,
        type: form.type || "banner",
        city: form.city || null,
        image_url: path,
        media_type: file.type.startsWith("video") ? "video" : "image",
        sort_order: (banners?.length ?? 0) + 1,
        status: "ativo",
      });
      if (error) {
        await removeMedia("banners", path);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Banner publicado");
      setForm(emptyForm);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao publicar", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"banners"> }) => {
      const { error } = await supabase.from("banners").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const destroy = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string | null }) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      await removeMedia("banners", path);
    },
    onSuccess: () => {
      toast.success("Banner removido");
      invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  return (
    <div>
      <PageHeader
        title="Banners"
        description="Vitrine de imagens e vídeos exibida na tela inicial do associado"
      />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-2">
        <div>
          <Label>Título</Label>
          <Input
            className="mt-1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Economize no seu bairro"
          />
        </div>
        <div>
          <Label>Etiqueta</Label>
          <Input
            className="mt-1"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder="banner, promoção, destaque..."
          />
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            rows={2}
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
        <div>
          <Label>Link ao clicar (opcional)</Label>
          <Input
            className="mt-1"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>Cidade (opcional)</Label>
          <Input
            className="mt-1"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Imagem ou vídeo</Label>
          <Input
            ref={fileRef}
            className="mt-1"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Até 50 MB. Recomendado 1200x600 px para imagens.
          </p>
        </div>
        <div className="md:col-span-2">
          <Button
            disabled={!form.title.trim() || !file || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Publicar banner
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {(banners ?? []).map((b) => {
          const url = b.image_url ? media?.[b.image_url] : undefined;
          return (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="aspect-[2/1] w-full bg-muted">
                {url && b.media_type === "video" ? (
                  <video src={url} className="size-full object-cover" muted loop controls playsInline />
                ) : url ? (
                  <img src={url} alt={b.title} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <Input
                  defaultValue={b.title}
                  onBlur={(e) =>
                    e.target.value !== b.title &&
                    update.mutate({ id: b.id, patch: { title: e.target.value } })
                  }
                />
                <Input
                  defaultValue={b.subtitle ?? ""}
                  placeholder="Descrição"
                  onBlur={(e) =>
                    e.target.value !== (b.subtitle ?? "") &&
                    update.mutate({ id: b.id, patch: { subtitle: e.target.value || null } })
                  }
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24"
                    defaultValue={b.sort_order}
                    onBlur={(e) =>
                      update.mutate({ id: b.id, patch: { sort_order: Number(e.target.value) } })
                    }
                  />
                  <Button
                    size="sm"
                    variant={b.status === "ativo" ? "default" : "outline"}
                    onClick={() =>
                      update.mutate({
                        id: b.id,
                        patch: { status: b.status === "ativo" ? "inativo" : "ativo" },
                      })
                    }
                  >
                    {b.status === "ativo" ? "Ativo" : "Inativo"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {b.impressions} views • {b.clicks} cliques
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => destroy.mutate({ id: b.id, path: b.image_url })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!banners?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum banner publicado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
