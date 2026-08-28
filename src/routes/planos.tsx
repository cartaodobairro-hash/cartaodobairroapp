import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PlanCard, PlanComparison, PlanSteps, type PlanRow } from "@/components/plans";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos do Cartão do Bairro — Individual e Família" },
      {
        name: "description",
        content:
          "Escolha seu Cartão do Bairro: Individual por R$ 9,90/mês ou Família por R$ 19,90/mês com até 10 dependentes, sem exigência de grau de parentesco.",
      },
      { property: "og:title", content: "Planos do Cartão do Bairro — Individual e Família" },
      {
        property: "og:description",
        content: "Individual R$ 9,90/mês ou Família R$ 19,90/mês com até 10 dependentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicPlans,
});

function PublicPlans() {
  const { data: plans } = useQuery({
    queryKey: ["public-plans-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("status", "ativo")
        .order("price");
      if (error) throw error;
      return data as unknown as PlanRow[];
    },
  });

  const individual = plans?.find((p) => p.max_dependents === 0);
  const familia = plans?.find((p) => p.max_dependents > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/">
          <BrandLogo />
        </Link>
        <Button asChild size="sm">
          <Link to="/auth" search={{ modo: "cadastro", vendedor: "" }}>
            Criar conta
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <section className="py-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha seu cartão</h1>
          <p className="mt-2 text-muted-foreground">
            Tenha benefícios e descontos perto de você. Mais pessoas. Mais benefícios. Mais economia.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              featured={plan.max_dependents > 0}
              action={
                <Button asChild className="w-full">
                  <Link to="/auth" search={{ modo: "cadastro", vendedor: "" }}>
                    Escolher plano
                  </Link>
                </Button>
              }
            />
          ))}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Comparação dos planos</h2>
          <PlanComparison
            individualPrice={individual?.price ?? 9.9}
            familyPrice={familia?.price ?? 19.9}
          />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Como funciona a contratação</h2>
          <PlanSteps />
          <p className="mt-3 text-sm text-muted-foreground">
            Após a confirmação do pagamento, a assinatura é ativada e o cartão digital é gerado
            automaticamente, com QR Code e validade.
          </p>
        </section>
      </main>
    </div>
  );
}
