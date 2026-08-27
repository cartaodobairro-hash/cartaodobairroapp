import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, useProfile } from "@/lib/auth";
import { useRealtimeCard } from "@/lib/realtime";
import { dateBR, maskCpf, firstOf, brl } from "@/lib/format";
import { PageHeader } from "@/components/shells";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/cartao")({
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
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const status = statusMap[card?.status ?? "pendente"] ?? statusMap["pendente"]!;
  const planName = subscription?.plans?.name ?? customer?.plans?.name ?? "—";
  const isActive = card?.status === "ativo";

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
            <Link to="/app/conta">Ver minha assinatura</Link>
          </Button>
        </div>
      ) : (
        <div className="surface-ink rounded-3xl p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <BrandLogo onDark />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest opacity-70">
                Associado
              </p>
              <p className="text-lg font-extrabold leading-tight">{profile?.name ?? "—"}</p>
              <p className="text-xs opacity-70">{profile?.cpf ? maskCpf(profile.cpf) : ""}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.tone}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xl font-bold tracking-widest">{card.card_number}</p>
              <p className="mt-1 text-xs opacity-70">
                Plano {planName} • validade {dateBR(card.expires_at)}
              </p>
              <p className="text-[11px] opacity-60">Emitido em {dateBR(card.issued_at)}</p>
            </div>
            <div className={`rounded-xl bg-white p-2 ${isActive ? "" : "opacity-40 grayscale"}`}>
              <QRCodeSVG value={card.qr_token} size={92} />
            </div>
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-widest text-primary">
            Desconto de verdade. Perto de você.
          </p>
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

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Dependentes
      </h2>
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
            Você ainda não cadastrou dependentes. O limite depende do seu plano
            {subscription?.plans?.max_dependents != null
              ? ` (${subscription.plans.max_dependents})`
              : customer?.plans
                ? ` (${customer.plans.max_dependents})`
                : ""}
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
