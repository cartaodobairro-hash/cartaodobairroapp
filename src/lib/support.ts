/** Número oficial do WhatsApp de suporte da empresa (55 + DDD + número). */
export const SUPPORT_WHATSAPP_NUMBER = "5591980609281";

export const SUPPORT_WHATSAPP_DISPLAY = "(91) 98060-9281";

/** Link wa.me do suporte oficial; abre a conversa direto no WhatsApp do cliente. */
export function supportWhatsappLink(text?: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
