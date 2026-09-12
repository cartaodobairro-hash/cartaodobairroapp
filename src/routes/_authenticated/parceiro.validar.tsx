import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/lib/auth";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, dateBR } from "@/lib/format";

type Found = {
  id: string;
  customer_id: string;
  card_number: string;
  status: string;
  expires_at: string | null;
};

export const Route = createFileRoute("/_authenticated/parceiro/validar")({
  component: ValidateCard,
});

function ValidateCard() {
  const { data: partner } = usePartner();
  const [code, setCode] = useState("");
  const [benefitId, setBenefitId] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: benefits } = useQuery({
    queryKey: ["partner-benefits", partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("id, title")
        .eq("partner_id", partner!.id)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
  });

  async function search() {
    setBusy(true);
    const value = code.trim();
    const { data, error } = await supabase.rpc("lookup_card_for_validation", { _code: value });
    setBusy(false);
    if (error) {
      toast.error("Erro na consulta", { description: error.message });
      return;
    }
    const found = (data ?? [])[0];
    if (!found) {
      setCard(null);
      toast.error("Cartão não encontrado");
      return;
    }
    setCard(found as Found);
  }

  async function confirm() {
    if (!card || !partner) return;
    const purchase = Number(purchaseAmount);
    const discount = Number(amount);
    if (!purchaseAmount || !Number.isFinite(purchase) || purchase <= 0) {
      toast.error("Informe o valor total da compra");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > purchase) {
      toast.error("O desconto deve ser menor ou igual ao valor da compra");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("card_usage").insert({
      card_id: card.id,
      customer_id: card.customer_id,
      partner_id: partner.id,
      benefit_id: benefitId || null,
      purchase_amount: purchase,
      amount_saved: discount,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível registrar", { description: error.message });
      return;
    }
    toast.success("Benefício validado!");
    setCard(null);
    setCode("");
    setPurchaseAmount("");
    setAmount("");
  }

  if (!partner) return <p className="text-sm text-muted-foreground">Cadastre sua empresa primeiro.</p>;

  const valid = card?.status === "ativo";

  return (
    <div className="max-w-lg">
      <PageHeader title="Validar cartão" description="Informe o código do QR Code ou o número do cartão" />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <Label>Código do cartão</Label>
        <div className="mt-1 flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="QR ou número" />
          <Button onClick={search} disabled={busy || !code}>
            Buscar
          </Button>
        </div>
      </div>

      {card ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            {valid ? (
              <CheckCircle2 className="size-6 text-primary" />
            ) : (
              <XCircle className="size-6 text-destructive" />
            )}
            <div>
              <p className="font-bold">{card.card_number}</p>
              <p className="text-xs text-muted-foreground">
                {valid ? "Cartão ativo" : `Cartão ${card.status}`} • validade {dateBR(card.expires_at)}
              </p>
            </div>
          </div>

          {valid ? (
            <div className="mt-4 space-y-3">
              <div>
                <Label>Benefício utilizado</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={benefitId}
                  onChange={(e) => setBenefitId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(benefits ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Valor total da compra ({brl(0).replace(/[\d.,\s]/g, "")})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Desconto aplicado ({brl(0).replace(/[\d.,\s]/g, "")})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  max={purchaseAmount || undefined}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button onClick={confirm} disabled={busy} className="w-full">
                Confirmar validação
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-destructive">
              Este cartão não está ativo e não pode receber benefícios.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
