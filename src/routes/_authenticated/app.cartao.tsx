import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, useProfile } from "@/lib/auth";
import { dateBR, maskCpf, firstOf } from "@/lib/format";
import { PageHeader } from "@/components/shells";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/_authenticated/app/cartao")({
  component: DigitalCard,
});

function DigitalCard() {
  const { data: profile } = useProfile();
  const { data: customer } = useCustomer();
  const card = firstOf(customer?.cards);

  const { data: dependents } = useQuery({
    queryKey: ["dependents", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .eq("customer_id", customer!.id);
      if (error) throw error;
      return data;
    },
  });

  const statusLabel =
    card?.status === "ativo"
      ? "Ativo"
      : card?.status === "bloqueado"
        ? "Bloqueado"
        : card?.status === "expirado"
          ? "Expirado"
          : "Pendente";

  return (
    <div className="px-4 pt-5">
      <PageHeader title="Cartão digital" description="Apresente o QR Code no parceiro" />

      <div className="surface-ink rounded-3xl p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <BrandMark />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest opacity-70">
              Associado
            </p>
            <p className="text-lg font-extrabold leading-tight">{profile?.name ?? "—"}</p>
            <p className="text-xs opacity-70">{profile?.cpf ? maskCpf(profile.cpf) : ""}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              card?.status === "ativo"
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 text-white/80"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xl font-bold tracking-widest">
              {card?.card_number ?? "•••• •••• ••••"}
            </p>
            <p className="mt-1 text-xs opacity-70">
              Plano {customer?.plans?.name ?? "—"} • validade {dateBR(card?.expires_at)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={card?.qr_token ?? "cartao-do-bairro"} size={92} />
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        O parceiro escaneia o QR Code para validar seu benefício. O código muda a cada emissão de
        cartão e é pessoal e intransferível.
      </p>

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
              <p className="text-xs text-muted-foreground">{d.relationship ?? "Dependente"}</p>
            </div>
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              {d.status}
            </span>
          </div>
        ))}
        {!dependents?.length ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não cadastrou dependentes. O limite depende do seu plano
            {customer?.plans ? ` (${customer.plans.max_dependents})` : ""}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
