import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  ativo: "bg-success/10 text-success",
  paga: "bg-success/10 text-success",
  aprovado: "bg-success/10 text-success",
  aprovada: "bg-success/10 text-success",
  pendente: "bg-warning/20 text-warning-foreground",
  pagamento: "bg-warning/20 text-warning-foreground",
  cadastro: "bg-primary/10 text-primary",
  contato: "bg-primary/10 text-primary",
  novo: "bg-secondary text-secondary-foreground",
  cancelada: "bg-destructive/10 text-destructive",
  cancelado: "bg-destructive/10 text-destructive",
  perdido: "bg-destructive/10 text-destructive",
};

export function SellerStatus({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", tones[value] ?? "bg-muted text-muted-foreground")}>
      {value}
    </span>
  );
}