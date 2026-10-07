import brandLogo from "@/assets/cartao-logo-completa.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={brandLogo.url}
      alt="Cartão do Bairro — desconto de verdade, perto de você"
      className={cn(
        "inline-block h-20 w-28 shrink-0 rounded-lg object-contain",
        className,
      )}
    />
  );
}

export function BrandLogo({
  className,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <BrandMark className={cn(className)} />
  );
}
