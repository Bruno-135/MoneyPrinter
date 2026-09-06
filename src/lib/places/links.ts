/**
 * Ligações externas para um comércio.
 *
 * Todas se constroem a partir do que já está gravado — nenhuma precisa de uma
 * chamada nova à API. O `google_place_id` chega para montar o URL do Maps, e é
 * por isso que não vale a pena pedir `googleMapsUri` à Google: seria um campo a
 * mais na resposta e obrigaria a voltar a consultar os 111 comércios que já
 * temos, para obter algo que já sabemos construir.
 */

/** Ficha do comércio no Google Maps. Formato oficial baseado no place id. */
export function googleMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

/**
 * Conversa no WhatsApp com uma mensagem já escrita.
 *
 * O wa.me quer o número sem o `+` e sem separadores. Devolve null quando não há
 * número normalizado: um link de WhatsApp para um número mal formado abre uma
 * conversa vazia com um contacto que não existe, o que é pior do que não ter link.
 */
export function whatsappUrl(phoneE164: string | null, message?: string): string | null {
  if (!phoneE164) return null;

  const digits = phoneE164.replace(/[^\d]/g, '');
  if (digits.length < 8) return null;

  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/** Mensagem inicial sugerida para o primeiro contacto. */
export function firstContactMessage(businessName: string): string {
  return `Olá! Falo da parte de um serviço de criação de sites. Reparei que a ${businessName} ainda não tem site próprio e preparei uma proposta à medida. Posso mostrar-lhe?`;
}
