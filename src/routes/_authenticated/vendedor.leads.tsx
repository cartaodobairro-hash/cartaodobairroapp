import { createFileRoute } from "@tanstack/react-router";
import { SellerClients } from "@/components/seller/leads";
export const Route=createFileRoute("/_authenticated/vendedor/leads")({staticData:{sitemap:false},head:()=>({meta:[{title:"Meus clientes | Cartão do Bairro"},{name:"description",content:"Clientes e propostas do vendedor."},{property:"og:title",content:"Meus clientes | Cartão do Bairro"},{property:"og:description",content:"Acompanhe clientes e propostas."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:SellerClients});
