import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { usePartner, useSeller } from "@/lib/auth";
import { enablePartnerSales } from "@/lib/partner-sales.functions";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerLink } from "@/components/seller/link";
import { SellerQr } from "@/components/seller/qr-code";
import { NewSale } from "@/components/seller/nova-venda";
import { SellerClients } from "@/components/seller/leads";
import { Commissions } from "@/components/seller/comissoes";

export const Route = createFileRoute("/_authenticated/parceiro/vendas")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Vendas no balcão | Cartão do Bairro" },
      { name: "description", content: "Venda o Cartão do Bairro e cadastre clientes direto do painel do parceiro." },
      { property: "og:title", content: "Vendas no balcão | Cartão do Bairro" },
      { property: "og:description", content: "Link, QR Code, propostas, clientes e comissões do parceiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerSales,
});

function PartnerSales() {
  const { data: partner } = usePartner();
  const { data: seller, isLoading } = useSeller();
  const enable = useServerFn(enablePartnerSales);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("nova");

  async function activate() {
    setBusy(true);
    try {
      await enable();
      await queryClient.invalidateQueries({ queryKey: ["my-seller"] });
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Área de vendas ativada!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (!seller) {
    return (
      <div>
        <PageHeader title="Vendas / Balcão" description="Venda o Cartão do Bairro para seus clientes e ganhe comissão" />
        <section className="max-w-xl rounded-lg border bg-card p-6 shadow-card">
          <Store className="size-8 text-primary" />
          <h2 className="mt-3 text-lg font-bold">Ative sua área de vendas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você recebe um link e um QR Code exclusivos do seu estabelecimento. Todo cliente que se cadastrar por eles fica vinculado a você e gera comissão, usando o mesmo login deste painel.
          </p>
          {partner?.status !== "aprovado" && (
            <p className="mt-3 text-sm text-muted-foreground">Disponível após a aprovação do seu cadastro.</p>
          )}
          <Button className="mt-4" onClick={activate} disabled={busy || partner?.status !== "aprovado"}>
            {busy ? "Ativando..." : "Ativar vendas"}
          </Button>
        </section>
      </div>
    );
  }

  if (seller.status !== "ativo") {
    return (
      <div>
        <PageHeader title="Vendas / Balcão" />
        <p className="text-sm text-muted-foreground">Sua área de vendas está desativada. Fale com a administração.</p>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
        <TabsTrigger value="nova">Novo cliente</TabsTrigger>
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        <TabsTrigger value="link">Meu link</TabsTrigger>
        <TabsTrigger value="qr">QR Code</TabsTrigger>
      </TabsList>
      <TabsContent value="nova"><NewSale /></TabsContent>
      <TabsContent value="clientes">
        <SellerClients title="Clientes do estabelecimento" action={<Button onClick={() => setTab("nova")}>Novo cliente</Button>} />
      </TabsContent>
      <TabsContent value="comissoes"><Commissions /></TabsContent>
      <TabsContent value="link"><SellerLink /></TabsContent>
      <TabsContent value="qr"><SellerQr /></TabsContent>
    </Tabs>
  );
}
