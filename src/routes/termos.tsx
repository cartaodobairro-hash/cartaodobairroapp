import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — Cartão do Bairro" },
      { name: "description", content: "Regras de uso do clube de benefícios Cartão do Bairro." },
      { property: "og:title", content: "Termos de uso — Cartão do Bairro" },
      { property: "og:description", content: "Regras de uso do clube de benefícios Cartão do Bairro." },
    ],
  }),
  component: () => (
    <LegalPage title="Termos de uso">
      <p>
        O Cartão do Bairro é um clube de benefícios que oferece descontos em empresas parceiras. Não
        se trata de plano de saúde, seguro ou instituição financeira.
      </p>
      <h2>1. Assinatura</h2>
      <p>
        O acesso aos benefícios depende de assinatura ativa. Cartões vencidos, bloqueados ou
        cancelados não podem ser utilizados nos parceiros.
      </p>
      <h2>2. Dependentes</h2>
      <p>
        O titular pode cadastrar dependentes conforme o limite do plano contratado. Cada dependente
        é vinculado ao titular e segue o mesmo status do cartão.
      </p>
      <h2>3. Uso dos benefícios</h2>
      <p>
        Os descontos são concedidos diretamente pelo parceiro mediante validação do QR Code. Cada
        benefício possui regras próprias de uso, horários e limites.
      </p>
      <h2>4. Cancelamento</h2>
      <p>
        A assinatura pode ser cancelada a qualquer momento pelo aplicativo. O acesso permanece
        disponível até o fim do período já pago.
      </p>
      <h2>5. Responsabilidades</h2>
      <p>
        A qualidade dos produtos e serviços é de responsabilidade de cada empresa parceira. O Cartão
        do Bairro atua na intermediação e curadoria da rede.
      </p>
    </LegalPage>
  ),
});

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Link to="/">
          <BrandLogo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:pt-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
