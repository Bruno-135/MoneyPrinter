/**
 * Ligações externas para um comércio.
 *
 * Todas se constroem a partir do que já está gravado — nenhuma precisa de uma
 * chamada nova à API.
 */

export interface MapsTarget {
  /** Identificador do sítio no Google. É o que aponta ao ponto exato. */
  googlePlaceId?: string | null;
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Ficha do comércio no Google Maps.
 *
 * Usa o formato documentado das Maps URLs — `/maps/search/?api=1&query=…` com
 * `query_place_id` — e não o velho `/maps/place/?q=place_id:…`. O antigo
 * funcionava no computador e falhava no telemóvel, que é onde se abre isto: a
 * app abria e dizia que não encontrava nada.
 *
 * O `query` não é decoração. Se o identificador estiver velho — o Google
 * reemite-os e os antigos deixam de resolver — é o `query` que salva a
 * ligação, e por isso leva o nome e a morada, que é o que uma pessoa
 * escreveria. Cair numa pesquisa pelo nome é muito melhor do que cair num erro.
 */
export function googleMapsUrl(target: MapsTarget): string {
  const written = [target.name, target.address]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');

  const coords =
    typeof target.latitude === 'number' && typeof target.longitude === 'number'
      ? `${target.latitude},${target.longitude}`
      : '';

  // O `query` é obrigatório neste formato. A ordem é a da utilidade: o nome e a
  // morada dizem alguma coisa a quem está a olhar para o ecrã; as coordenadas
  // acertam no sítio mas mostram um alfinete sem nome.
  const query = written || coords || target.googlePlaceId || '';

  const params = new URLSearchParams({ api: '1', query });
  if (target.googlePlaceId) params.set('query_place_id', target.googlePlaceId);

  return `https://www.google.com/maps/search/?${params.toString()}`;
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

/*
 * Houve aqui uma `firstContactMessage` — uma frase feita com o nome do comércio
 * lá dentro, para o botão de WhatsApp. Saiu quando as mensagens passaram a ser
 * escritas para cada comércio (`lib/ai/abordagem-texto.ts`, tabela
 * `outreach_messages`). Servia para tudo e por isso não servia para nada: trinta
 * comerciantes a receber a mesma frase reconhecem-na pelo que é.
 */
