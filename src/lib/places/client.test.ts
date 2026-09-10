import { describe, expect, it, vi } from 'vitest';
import { PlacesClient } from './client';

/** Resposta falsa, para os testes não tocarem na rede nem gastarem dinheiro. */
function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

const NEARBY = { latitude: 41.5454, longitude: -8.4265, radiusMeters: 1500, includedTypes: ['bakery'] };

function client(fetchImpl: typeof fetch) {
  return new PlacesClient({ apiKey: 'chave-de-teste', fetchImpl });
}

describe('PlacesClient — distinguir tipo inválido de outros erros 400', () => {
  it('NÃO trata uma chave inválida como tipo desconhecido', async () => {
    // Regressão de um erro real: a primeira versão procurava a palavra "type"
    // em qualquer ponto do corpo, e todos os erros da Google trazem "@type" nos
    // detalhes. Uma chave inválida era anunciada como tipo errado, e o
    // varrimento ainda gastava uma chamada extra num recurso inútil.
    const result = await client(
      fakeFetch(400, {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' },
          ],
        },
      }),
    ).searchNearby(NEARBY);

    expect(result.ok).toBe(false);
    expect(result.invalidType).toBe(false);
    expect(result.errorMessage).toContain('API key not valid');
  });

  it('reconhece mesmo um tipo desconhecido', async () => {
    const result = await client(
      fakeFetch(400, {
        error: {
          code: 400,
          message: "Invalid included type: 'padaria'",
          status: 'INVALID_ARGUMENT',
          details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest' }],
        },
      }),
    ).searchNearby(NEARBY);

    expect(result.invalidType).toBe(true);
  });

  it('não confunde um 403 com tipo inválido', async () => {
    const result = await client(
      fakeFetch(403, { error: { code: 403, message: 'Requests to this API are blocked.', status: 'PERMISSION_DENIED' } }),
    ).searchNearby(NEARBY);

    expect(result.invalidType).toBe(false);
    expect(result.httpStatus).toBe(403);
  });
});

describe('PlacesClient — respostas com sucesso', () => {
  it('devolve os locais e marca ok', async () => {
    const result = await client(
      fakeFetch(200, { places: [{ id: 'a', displayName: { text: 'Padaria' } }] }),
    ).searchNearby(NEARBY);

    expect(result.ok).toBe(true);
    expect(result.places).toHaveLength(1);
    expect(result.errorMessage).toBeNull();
  });

  it('guarda o corpo do pedido para poder ser gravado em bruto', async () => {
    const result = await client(fakeFetch(200, { places: [] })).searchNearby(NEARBY);
    const params = result.requestParams as Record<string, unknown>;

    expect(params.includedTypes).toEqual(['bakery']);
    // DISTANCE e não POPULARITY: ver o comentário em searchNearby.
    expect(params.rankPreference).toBe('DISTANCE');
  });
});

describe('PlacesClient — falhas de rede', () => {
  it('não rebenta, e assinala que nada foi faturado', async () => {
    const failing = vi.fn(async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;

    const result = await client(failing).searchNearby(NEARBY);

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(0);
    expect(result.errorMessage).toContain('Falha de rede');
  });
});

describe('PlacesClient — validação', () => {
  it('recusa arrancar sem chave', () => {
    expect(() => new PlacesClient({ apiKey: '' })).toThrow(/GOOGLE_PLACES_API_KEY/);
  });
});

describe('fetchReviews', () => {
  it('pede o idioma na QUERY, que é onde a Google o lê', async () => {
    let pedido: string | undefined;
    const places = client((async (url: string | URL) => {
      pedido = url.toString();
      return new Response(JSON.stringify({ reviews: [] }), { status: 200 });
    }) as unknown as typeof fetch);

    await places.fetchReviews('ChIJabc');

    // Um cabeçalho `X-Goog-LanguageCode` seria ignorado em silêncio e as
    // avaliações vinham na língua em que foram escritas — que foi o que
    // aconteceu, e é o que este teste existe para impedir que volte.
    expect(pedido).toContain('languageCode=pt');
    expect(pedido).toContain('places/ChIJabc');
  });

  it('devolve a lista vazia em vez de rebentar quando a Google recusa', async () => {
    const places = client((async () => new Response('nope', { status: 403 })) as unknown as typeof fetch);
    const r = await places.fetchReviews('ChIJabc');
    expect(r.ok).toBe(false);
    expect(r.reviews).toEqual([]);
    expect(r.errorMessage).toContain('403');
  });
});
