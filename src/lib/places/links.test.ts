import { describe, expect, it } from 'vitest';
import { googleMapsUrl, whatsappUrl, whatsappWebUrl } from './links';

/**
 * O formato antigo — `/maps/place/?q=place_id:…` — funcionava no computador e
 * falhava no telemóvel: a app do Maps abria e dizia que não encontrava nada.
 * Estes testes travam o regresso a esse formato e garantem que a ligação
 * continua a servir para alguma coisa mesmo quando o identificador falha.
 */
describe('googleMapsUrl', () => {
  const ODETE = {
    googlePlaceId: 'ChIJ13ERfjFlJA0REJ0tTvgnNWs',
    name: 'Odete Vegan Bakery',
    address: 'R. de Santo Ildefonso 478, 4000-467 Porto',
    latitude: 41.147,
    longitude: -8.601,
  };

  it('usa o formato documentado das Maps URLs, com o identificador do sítio', () => {
    const url = new URL(googleMapsUrl(ODETE));

    expect(url.pathname).toBe('/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query_place_id')).toBe(ODETE.googlePlaceId);
  });

  it('nunca volta ao formato que falhava no telemóvel', () => {
    expect(googleMapsUrl(ODETE)).not.toContain('place_id:');
  });

  it('leva o nome e a morada, para a ligação valer mesmo com o identificador velho', () => {
    // O Google reemite identificadores e os antigos deixam de resolver. Sem o
    // `query`, isso dava um ecrã de erro; com ele, dá a pesquisa certa.
    const query = new URL(googleMapsUrl(ODETE)).searchParams.get('query');

    expect(query).toBe('Odete Vegan Bakery, R. de Santo Ildefonso 478, 4000-467 Porto');
  });

  it('sem morada, usa as coordenadas', () => {
    const query = new URL(
      googleMapsUrl({ googlePlaceId: 'ChIJabc', latitude: 41.5454, longitude: -8.4265 }),
    ).searchParams.get('query');

    expect(query).toBe('41.5454,-8.4265');
  });

  it('só com o identificador, ainda assim monta um endereço utilizável', () => {
    const url = new URL(googleMapsUrl({ googlePlaceId: 'ChIJabc' }));

    expect(url.searchParams.get('query')).toBe('ChIJabc');
    expect(url.searchParams.get('query_place_id')).toBe('ChIJabc');
  });

  it('escapa o que partiria o endereço', () => {
    expect(googleMapsUrl({ name: 'a b&c' })).toContain('a+b%26c');
  });
});

describe('whatsappUrl', () => {
  it('tira o + e os separadores, como o wa.me exige', () => {
    expect(whatsappUrl('+351253123456')).toBe('https://wa.me/351253123456');
  });

  it('funciona com números brasileiros', () => {
    expect(whatsappUrl('+5511912345678')).toBe('https://wa.me/5511912345678');
  });

  it('inclui a mensagem já escrita', () => {
    const url = whatsappUrl('+351253123456', 'Olá!');
    expect(url).toContain('?text=Ol%C3%A1!');
  });

  it('devolve null sem número, em vez de um link partido', () => {
    // Um link de WhatsApp para um número inválido abre uma conversa com um
    // contacto que não existe. Não ter link é melhor do que ter um mau.
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl('')).toBeNull();
    expect(whatsappUrl('+351')).toBeNull();
  });
});

describe('whatsappWebUrl', () => {
  it('leva a mesma conversa e a mesma mensagem para o WhatsApp Web', () => {
    const waMe = whatsappUrl('+351965633614', 'Olá, boa tarde!\n\nPosso avançar?')!;
    const web = new URL(whatsappWebUrl(waMe)!);
    expect(web.origin + web.pathname).toBe('https://web.whatsapp.com/send');
    expect(web.searchParams.get('phone')).toBe('351965633614');
    expect(web.searchParams.get('text')).toBe('Olá, boa tarde!\n\nPosso avançar?');
  });
  it('sem mensagem, abre só a conversa', () => {
    expect(whatsappWebUrl('https://wa.me/351965633614')).toBe(
      'https://web.whatsapp.com/send?phone=351965633614',
    );
  });
  it('recusa o que não é um link do wa.me', () => {
    expect(whatsappWebUrl('https://example.com/351965633614')).toBeNull();
    expect(whatsappWebUrl('não é um link')).toBeNull();
    expect(whatsappWebUrl('https://wa.me/123')).toBeNull();
  });
});
