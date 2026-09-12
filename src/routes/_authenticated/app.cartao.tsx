import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, useProfile } from "@/lib/auth";
import { useRealtimeCard } from "@/lib/realtime";
import { dateBR, maskCpf, firstOf, brl } from "@/lib/format";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import cardArtwork from "@/assets/cartao-do-bairro-cliente.jpeg.asset.json";

export const Route = createFileRoute("/_authenticated/app/cartao")({
  head: () => ({
    meta: [
      { title: "Meu cartão digital — Cartão do Bairro" },
      {
        name: "description",
        content: "Consulte seu cartão digital, QR Code, plano, situação e validade.",
      },
      { property: "og:title", content: "Meu cartão digital — Cartão do Bairro" },
      {
        property: "og:description",
        content: "Cartão digital com QR Code para validar benefícios nos parceiros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DigitalCard,
});

const statusMap: Record<string, { label: string; tone: string }> = {
  ativo: { label: "Ativo", tone: "bg-primary text-primary-foreground" },
  pendente: { label: "Pendente", tone: "bg-white/10 text-white/80" },
  bloqueado: { label: "Bloqueado", tone: "bg-destructive text-destructive-foreground" },
  expirado: { label: "Expirado", tone: "bg-white/10 text-white/80" },
};

function DigitalCard() {
  const { data: profile } = useProfile();
  const { data: customer } = useCustomer();
  const card = firstOf(customer?.cards);

  useRealtimeCard(customer?.id);

  const { data: subscription } = useQuery({
    queryKey: ["subscription", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(name, period, price, max_dependents)")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: dependents } = useQuery({
    queryKey: ["dependents", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .eq("customer_id", customer!.id)
        .is("removed_at", null)
        .eq("status", "ativo")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const status = statusMap[card?.status ?? "pendente"] ?? statusMap["pendente"]!;
  const planName = subscription?.plans?.name ?? customer?.plans?.name ?? "—";
  const isActive = card?.status === "ativo";
  const maxDependents =
    subscription?.plans?.max_dependents ?? customer?.plans?.max_dependents ?? 0;

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Cartão digital" description="Apresente o QR Code no parceiro" />

      {!card ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Seu cartão será emitido automaticamente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim que sua assinatura estiver ativa, o cartão digital aparece aqui — sem precisar
            recarregar a página.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/planos">Escolher meu plano</Link>
          </Button>
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-ink shadow-card">
          <img
            src={cardArtwork.url}
            alt="Cartão do Bairro — desconto de verdade, perto de você"
            className="absolute inset-0 size-full object-cover"
          />

          <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-card ${status.tone}`}>
              {status.label}
            </span>
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-2xl bg-background/90 p-3 shadow-card backdrop-blur-sm sm:inset-x-5 sm:bottom-5 sm:p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Associado</p>
              <p className="truncate text-sm font-extrabold leading-tight sm:text-base">
                {profile?.name ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {profile?.cpf ? maskCpf(profile.cpf) : ""}
              </p>
              <p className="mt-1 font-mono text-xs font-bold sm:text-sm">{card.card_number}</p>
              <p className="text-[10px] font-bold uppercase text-primary sm:text-xs">
                Plano: {planName}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Validade {dateBR(card.expires_at)} • emissão {dateBR(card.issued_at)}
              </p>
            </div>
            <div
              className={`shrink-0 rounded-xl bg-card p-2 ${isActive ? "" : "opacity-40 grayscale"}`}
              aria-label="QR Code do cartão"
            >
              <QRCodeSVG value={card.qr_token} className="size-[68px] sm:size-[88px]" />
            </div>
          </div>
        </div>
      )}

      {card && !isActive ? (
        <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          Cartão {status.label.toLowerCase()}. Regularize sua assinatura para voltar a usar os
          benefícios.
        </p>
      ) : null}

      <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        O parceiro escaneia o QR Code para validar seu benefício. O código é pessoal e
        intransferível.
      </p>

      {subscription ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
          <p className="font-semibold">Assinatura {subscription.status}</p>
          <p className="text-xs text-muted-foreground">
            {brl(subscription.amount)} • próximo vencimento {dateBR(subscription.next_due_date)}
          </p>
        </div>
      ) : null}

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Dependentes
        </h2>
        {maxDependents > 0 ? (
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/dependentes">Gerenciar</Link>
          </Button>
        ) : null}
      </div>
      <div className="space-y-2 pb-4">
        {(dependents ?? []).map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <div>
              <p className="text-sm font-semibold">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.relationship ?? "Dependente"}
                {d.cpf ? ` • ${maskCpf(d.cpf)}` : ""}
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              {d.status}
            </span>
          </div>
        ))}
        {!dependents?.length ? (
          <p className="text-sm text-muted-foreground">
            {maxDependents > 0
              ? `Você ainda não cadastrou dependentes. Seu plano permite até ${maxDependents}.`
              : "Seu plano é individual e não possui dependentes."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
