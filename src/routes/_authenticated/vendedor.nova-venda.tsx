import { createFileRoute } from "@tanstack/react-router";
import { NewSale } from "@/components/seller/nova-venda";
export const Route = createFileRoute("/_authenticated/vendedor/nova-venda")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Nova venda | Cartão do Bairro" },
    { name: "description", content: "Cadastre uma proposta e envie a adesão ao cliente." },
    { property: "og:title", content: "Nova venda | Cartão do Bairro" },
    { property: "og:description", content: "Cadastre uma proposta comercial do Cartão do Bairro." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: NewSale,
});
