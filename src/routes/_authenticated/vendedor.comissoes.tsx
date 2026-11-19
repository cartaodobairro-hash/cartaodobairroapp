import { createFileRoute } from "@tanstack/react-router";
import { Commissions } from "@/components/seller/comissoes";
export const Route = createFileRoute("/_authenticated/vendedor/comissoes")({
  staticData: { sitemap: false }, head: () => ({ meta: [{ title: "Comissões | Cartão do Bairro" }, { name: "description", content: "Comissões do vendedor." }, { property: "og:title", content: "Comissões | Cartão do Bairro" }, { property: "og:description", content: "Acompanhe comissões geradas e pagas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Commissions });
