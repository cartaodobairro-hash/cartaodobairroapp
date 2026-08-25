export const brl = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

export const dateBR = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

export const dateTimeBR = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

export const maskCpf = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskPhone = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

export const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export const maskCnpj = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function partnerAddress(p: {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  return [
    [p.street, p.number].filter(Boolean).join(", "),
    p.neighborhood,
    [p.city, p.state].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(" • ");
}

export function mapsDirectionsUrl(p: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  street?: string | null;
  number?: string | null;
  city?: string | null;
}) {
  const q =
    p.latitude && p.longitude
      ? `${p.latitude},${p.longitude}`
      : encodeURIComponent([p.street, p.number, p.city].filter(Boolean).join(" "));
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function mapsEmbedUrl(q: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`;
}
