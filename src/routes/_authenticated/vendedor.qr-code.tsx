import { createFileRoute } from "@tanstack/react-router";
import { SellerQr } from "@/components/seller/qr-code";
export const Route=createFileRoute("/_authenticated/vendedor/qr-code")({staticData:{sitemap:false},head:()=>({meta:[{title:"Meu QR Code | Cartão do Bairro"},{name:"description",content:"QR Code exclusivo do vendedor."},{property:"og:title",content:"Meu QR Code | Cartão do Bairro"},{property:"og:description",content:"QR Code para novas adesões."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:SellerQr});
