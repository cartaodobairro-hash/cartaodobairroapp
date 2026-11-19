import { createFileRoute } from "@tanstack/react-router";
import { SellerLink } from "@/components/seller/link";
export const Route=createFileRoute("/_authenticated/vendedor/link")({staticData:{sitemap:false},head:()=>({meta:[{title:"Meu link | Cartão do Bairro"},{name:"description",content:"Link exclusivo do vendedor."},{property:"og:title",content:"Meu link | Cartão do Bairro"},{property:"og:description",content:"Compartilhe seu link de vendas."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:SellerLink});
