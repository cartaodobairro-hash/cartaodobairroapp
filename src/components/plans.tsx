import { Check, Users, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";

export type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  period: string;
  max_dependents: number;
  highlights: string[];
  rules?: string | null;
};

export function isFamilyPlan(plan: Pick<PlanRow, "max_dependents">) {
  return plan.max_dependents > 0;
}

/** Cartão de apresentação de um plano. */
export function PlanCard({
  plan,
  featured,
  action,
  current,
}: {
  plan: PlanRow;
  featured?: boolean;
  action?: ReactNode;
  current?: boolean;
}) {
  const family = isFamilyPlan(plan);
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card",
        featured && "surface-ink border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        {family ? <Users className="size-5 text-primary" /> : <User className="size-5 text-primary" />}
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Cartão do Bairro
        </p>
      </div>
      <h3 className="mt-1 text-2xl font-extrabold tracking-tight">{plan.name}</h3>
      <p className={cn("text-sm", featured ? "opacity-75" : "text-muted-foreground")}>
        {family ? `Para você + até ${plan.max_dependents} dependentes.` : "Para 1 pessoa."}
      </p>

      <p className="mt-4 text-4xl font-extrabold tracking-tight">
        {brl(plan.price)}
        <span className={cn("text-sm font-semibold", featured ? "opacity-70" : "text-muted-foreground")}>
          /{plan.period === "anual" ? "ano" : "mês"}
        </span>
      </p>

      {plan.description ? (
        <p className={cn("mt-2 text-sm", featured ? "opacity-80" : "text-muted-foreground")}>
          {plan.description}
        </p>
      ) : null}

      <ul className="mt-4 space-y-1.5">
        {(plan.highlights ?? []).map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      {!family ? (
        <p className={cn("mt-3 text-xs", featured ? "opacity-70" : "text-muted-foreground")}>
          ✕ Não possui dependentes. O plano é exclusivamente individual.
        </p>
      ) : (
        <p className={cn("mt-3 text-xs", featured ? "opacity-70" : "text-muted-foreground")}>
          Sem exigência de grau de parentesco ou documento de vínculo familiar.
        </p>
      )}

      <div className="mt-5">
        {current ? (
          <Button className="w-full" variant="outline" disabled>
            Seu plano atual
          </Button>
        ) : (
          action
        )}
      </div>
    </div>
  );
}

const COMPARISON: { label: string; individual: string; familia: string }[] = [
  { label: "Titular", individual: "1", familia: "1" },
  { label: "Dependentes", individual: "✕ Nenhum", familia: "✓ Até 10" },
  { label: "Exigência de parentesco", individual: "—", familia: "✕ Não" },
  { label: "Cartão digital", individual: "✓", familia: "✓" },
  { label: "QR Code", individual: "✓", familia: "✓" },
  { label: "Benefícios", individual: "✓ Todos", familia: "✓ Todos" },
  { label: "Parceiros", individual: "✓ Todos", familia: "✓ Todos" },
  { label: "Mapa", individual: "✓", familia: "✓" },
  { label: "Promoções", individual: "✓", familia: "✓" },
  { label: "Aplicativo", individual: "✓ Completo", familia: "✓ Completo" },
];

export function PlanComparison({
  individualPrice = 9.9,
  familyPrice = 19.9,
}: {
  individualPrice?: number;
  familyPrice?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Recurso</th>
            <th className="p-3">Individual</th>
            <th className="p-3">Família</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((row) => (
            <tr key={row.label} className="border-b border-border/60 last:border-0">
              <td className="p-3 font-medium">{row.label}</td>
              <td className="p-3 text-muted-foreground">{row.individual}</td>
              <td className="p-3 text-muted-foreground">{row.familia}</td>
            </tr>
          ))}
          <tr className="bg-muted/50">
            <td className="p-3 font-bold">Valor mensal</td>
            <td className="p-3 font-bold">{brl(individualPrice)}</td>
            <td className="p-3 font-bold">{brl(familyPrice)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PlanSteps() {
  const steps = [
    "Escolha o plano",
    "Faça o cadastro",
    "Aceite os termos",
    "Realize o pagamento",
    "Assinatura ativada",
    "Cartão digital gerado",
  ];
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li
          key={s}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-card"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}
