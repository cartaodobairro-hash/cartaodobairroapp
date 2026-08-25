import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl surface-brand shadow-glow",
        className,
      )}
    >
      <Home className="size-5" strokeWidth={2.5} />
    </span>
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
