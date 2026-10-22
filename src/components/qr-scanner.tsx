import { useEffect, useRef, useState } from "react";

type Props = { onResult: (text: string) => void; onClose: () => void };

export function QrScanner({ onResult, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const s = new Html5Qrcode("qr-reader");
        scanner = s;
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (doneRef.current) return;
            doneRef.current = true;
            s.stop().catch(() => {}).finally(() => onResult(text));
          },
          () => {},
        );
      } catch {
        setError("Não foi possível abrir a câmera. Permita o acesso à câmera no navegador.");
      }
    })();
    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="mt-3 space-y-2">
      <div id="qr-reader" className="w-full overflow-hidden rounded-xl bg-muted" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground underline">
        Fechar câmera
      </button>
    </div>
  );
}
