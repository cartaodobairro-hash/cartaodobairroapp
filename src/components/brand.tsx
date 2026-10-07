import brandMark from "@/assets/cartao-brand-mark.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={brandMark.url}
      alt=""
      className={cn(
        "size-9 shrink-0 rounded-lg object-contain",
        className,
      )}
    />
  );
}

export function BrandLogo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      <span className="leading-none">
        <span
          className={cn(
            "block text-sm font-extrabold tracking-tight",
            onDark ? "text-ink-foreground" : "text-foreground",
          )}
        >
          CARTÃO
        </span>
        <span className="block text-sm font-extrabold tracking-tight text-primary">DO BAIRRO</span>
      </span>
    </span>
  );
}
