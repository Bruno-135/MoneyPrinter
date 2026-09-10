import type {
  PlaceResult,
  PlacesCallResult,
  SearchNearbyResponse,
  SearchTextResponse,
  PlacePhoto,
  PlaceReview,
} from './types';

/**
 * Cliente da Google Places API (New).
 *
 * Usa os endpoints v1 (`places:searchNearby`, `places:searchText`) e não os da
 * API antiga. A diferença mais visível é o `X-Goog-FieldMask`: na API nova, os
 * campos pedidos determinam o escalão de preço.
 *
 * A nossa máscara inclui `websiteUri`, `nationalPhoneNumber`, `rating` e
 * `userRatingCount`, que são campos do escalão Enterprise (~35 USD/1000).
 * Não há como evitar: o website é o dado central do produto. O que evita gastar
 * é o cache, não a máscara.
 */

const BASE_URL = 'https://places.googleapis.com/v1';

/**
 * Campos pedidos. Manter esta lista curta e deliberada — cada campo a mais
 * pode subir o escalão de preço sem trazer nada de útil.
 *
 * `places.photos` entra sem subir a fatura, e a razão é aritmética: o preço da
 * chamada é o do campo MAIS CARO da máscara, e esta já pede telefone,
 * avaliação e horário, que são do escalão de cima. Acrescentar um campo de um
 * escalão inferior não muda o escalão da chamada.
 *
 * Continua de fora `reviews` (e `editorialSummary`): esses SÃO de um escalão
 * acima do que se paga hoje, e acrescentá-los encarece TODAS as procuras, não
 * só as dos comércios de que se vai fazer site. Se um dia se quiserem as
 * avaliações escritas, pedem-se à parte, comércio a comércio.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.addressComponents',
  'places.location',
  'places.businessStatus',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.photos',
].join(',');

const TEXT_FIELD_MASK = `${FIELD_MASK},nextPageToken`;

/**
 * Máscara para procurar uma CIDADE, e não um comércio.
 *
 * É deliberadamente curta. Não leva telefone, website, avaliação nem horário —
 * os campos caros — porque de uma cidade só se quer saber onde fica e que área
 * ocupa. A `viewport` é o que dá o raio sem ter de o perguntar a ninguém.
 */
const CITY_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.viewport',
  'places.types',
].join(',');

/** Limite duro do Places: mais do que isto não devolve, haja o que houver. */
export const MAX_RESULTS_PER_CALL = 20;

export interface PlacesClientOptions {
  apiKey: string;
  /** Idioma das respostas. */
  languageCode?: string;
  /** Enviesa os resultados para as convenções de um país. */
  regionCode?: string;
  /** Substituível nos testes, para não haver rede. */
  fetchImpl?: typeof fetch;
}

export interface NearbyParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  includedTypes: string[];
  maxResultCount?: number;
}

export interface TextParams {
  textQuery: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  pageToken?: string;
}

/**
 * A Google rejeitou o pedido por causa de um tipo desconhecido em
 * `includedTypes`? Estas respostas (400) não são faturadas, e são o sinal para
 * passar à pesquisa por texto.
 *
 * A verificação olha só para a MENSAGEM do erro, e procura a expressão
 * concreta. A primeira versão disto procurava a palavra "type" em qualquer
 * ponto do corpo — e todos os erros da Google trazem um campo `@type` nos
 * detalhes, portanto uma chave inválida era diagnosticada como tipo errado.
 * O varrimento anunciava o problema errado e ainda gastava uma chamada extra a
 * tentar um recurso que não podia funcionar.
 */
function looksLikeInvalidType(status: number, parsed: unknown): boolean {
  if (status !== 400) return false;

  const message = (extractError(parsed) ?? '').toLowerCase();
  return /included[\s_]*type/.test(message) || message.includes('invalid type');
}

export class PlacesClient {
  private readonly apiKey: string;
  private readonly languageCode: string;
  private readonly regionCode: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PlacesClientOptions) {
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('PlacesClient precisa de uma GOOGLE_PLACES_API_KEY.');
    }
    this.apiKey = options.apiKey;
    this.languageCode = options.languageCode ?? 'pt';
    this.regionCode = options.regionCode;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Pesquisa por proximidade. Máximo 20 resultados, sem paginação. */
  async searchNearby(params: NearbyParams): Promise<PlacesCallResult> {
    const body = {
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResultCount ?? MAX_RESULTS_PER_CALL,
      // DISTANCE em vez do padrão POPULARITY: com um raio pequeno queremos os
      // mais próximos, para a grelha cobrir a área de forma previsível. Com
      // POPULARITY, células vizinhas devolveriam os mesmos estabelecimentos
      // famosos e os pequenos — que são os nossos prospetos — ficariam de fora.
      rankPreference: 'DISTANCE',
      languageCode: this.languageCode,
      ...(this.regionCode ? { regionCode: this.regionCode } : {}),
      locationRestriction: {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          radius: params.radiusMeters,
        },
      },
    };

    return this.call<SearchNearbyResponse>('places:searchNearby', FIELD_MASK, body);
  }

  /**
   * Procura uma cidade pelo nome.
   *
   * Separada da `searchText` de propósito: máscara diferente (mais barata),
   * sem enviesamento por localização — o ponto é justamente não saber ainda
   * onde é — e limitada a poucos resultados, que é quanto uma pessoa lê antes
   * de escolher.
   */
  async searchCity(query: string): Promise<PlacesCallResult> {
    // O corpo leva o MÍNIMO. Cada campo a mais é uma hipótese de a Google
    // devolver 400 por causa de um nome que mudou entre versões da API — e um
    // 400 aqui é o ecrã a dizer que não encontrou a cidade quando o problema
    // era outro. O número de resultados corta-se depois, do lado de cá, que é
    // de graça.
    //
    // `includedType: 'locality'` limitaria a resposta a cidades, mas deixaria
    // de fora freguesias e bairros que também interessam ao varrimento. O
    // filtro pelo que serve faz-se sobre `types`, também sem custo.
    const body = {
      textQuery: query,
      languageCode: this.languageCode,
      ...(this.regionCode ? { regionCode: this.regionCode } : {}),
    };

    return this.call<SearchTextResponse>('places:searchText', CITY_FIELD_MASK, body);
  }

  /** Pesquisa por texto. Usada como recurso quando o tipo não serve. */
  async searchText(params: TextParams): Promise<PlacesCallResult> {
    const body = {
      textQuery: params.textQuery,
      languageCode: this.languageCode,
      ...(this.regionCode ? { regionCode: this.regionCode } : {}),
      locationBias: {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          radius: params.radiusMeters,
        },
      },
      ...(params.pageToken ? { pageToken: params.pageToken } : {}),
    };

    return this.call<SearchTextResponse>('places:searchText', TEXT_FIELD_MASK, body);
  }

  /**
   * As fotografias de UM comércio, pedidas à parte.
   *
   * Máscara mínima de propósito — só `id` e `photos`. Uma consulta de detalhe
   * paga-se pelo campo mais caro que pede, e esta não pede nenhum dos caros:
   * fica no escalão de baixo. É a diferença entre pagar fotos de 976 comércios
   * e pagar as do punhado a que se vai mesmo fazer site.
   *
   * Devolve a lista tal como veio, com as atribuições agarradas. Mostrar quem
   * tirou a foto é condição de uso, e uma lista sem atribuições seria uma
   * lista que não se pode publicar.
   */
  async fetchPhotos(placeId: string): Promise<{ ok: boolean; photos: PlacePhoto[]; errorMessage: string | null }> {
    const url = `${BASE_URL}/places/${encodeURIComponent(placeId)}`;

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,photos',
        },
      });

      if (!response.ok) {
        return { ok: false, photos: [], errorMessage: `A Google respondeu ${response.status}.` };
      }

      const payload = (await response.json()) as { photos?: PlacePhoto[] };
      return { ok: true, photos: payload.photos ?? [], errorMessage: null };
    } catch (cause) {
      return {
        ok: false,
        photos: [],
        errorMessage: `Falha de rede: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
    }
  }

  /**
   * As avaliações escritas de UM comércio.
   *
   * Máscara de dois campos, mas ao contrário das fotos esta é cara: `reviews`
   * é de um escalão acima do que o varrimento paga. É por isso que não entra
   * na máscara geral e se pede aqui, comércio a comércio — pagar isto por 976
   * comércios para usar em meia dúzia não faz sentido nenhum.
   */
  async fetchReviews(placeId: string): Promise<{ ok: boolean; reviews: PlaceReview[]; errorMessage: string | null }> {
    const url = `${BASE_URL}/places/${encodeURIComponent(placeId)}`;

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,reviews',
          // A Google devolve a avaliação traduzida para este idioma quando
          // existe tradução, e o original quando não existe.
          'X-Goog-LanguageCode': this.languageCode,
        },
      });

      if (!response.ok) {
        return { ok: false, reviews: [], errorMessage: `A Google respondeu ${response.status}.` };
      }

      const payload = (await response.json()) as { reviews?: PlaceReview[] };
      return { ok: true, reviews: payload.reviews ?? [], errorMessage: null };
    } catch (cause) {
      return {
        ok: false,
        reviews: [],
        errorMessage: `Falha de rede: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
    }
  }

  /**
   * Troca o nome de uma foto pelo endereço da imagem.
   *
   * `skipHttpRedirect` faz a Google devolver o endereço em JSON em vez de
   * responder com um desvio. Isso é o que permite que a chave nunca saia
   * daqui: se se deixasse o browser seguir o desvio, o endereço com a chave
   * lá dentro ficava à vista de quem abrisse a página.
   *
   * O endereço devolvido é temporário — por isso é que ele se guarda com uma
   * validade e não para sempre.
   */
  async fetchPhotoUri(
    photoName: string,
    maxWidthPx: number,
  ): Promise<{ ok: boolean; uri: string | null; errorMessage: string | null }> {
    // O nome vem da Google no formato `places/X/photos/Y`. Segmento a
    // segmento para não haver maneira de um valor forjado sair do caminho.
    const caminho = photoName
      .split('/')
      .map((segmento) => encodeURIComponent(segmento))
      .join('/');

    const url =
      `${BASE_URL}/${caminho}/media` +
      `?maxWidthPx=${Math.round(maxWidthPx)}&skipHttpRedirect=true`;

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { 'X-Goog-Api-Key': this.apiKey },
      });

      if (!response.ok) {
        return { ok: false, uri: null, errorMessage: `A Google respondeu ${response.status}.` };
      }

      const payload = (await response.json()) as { photoUri?: string };
      return { ok: true, uri: payload.photoUri ?? null, errorMessage: null };
    } catch (cause) {
      return {
        ok: false,
        uri: null,
        errorMessage: `Falha de rede: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
    }
  }

  private async call<T extends SearchNearbyResponse | SearchTextResponse>(
    endpoint: string,
    fieldMask: string,
    body: unknown,
  ): Promise<PlacesCallResult> {
    const base: Omit<PlacesCallResult, 'ok' | 'httpStatus' | 'places' | 'raw' | 'errorMessage' | 'invalidType' | 'nextPageToken'> = {
      requestParams: body,
      endpoint,
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      // Falha de rede: nunca chegou à Google, portanto não foi faturada.
      return {
        ...base,
        ok: false,
        httpStatus: 0,
        places: [],
        raw: null,
        errorMessage: `Falha de rede: ${cause instanceof Error ? cause.message : String(cause)}`,
        invalidType: false,
        nextPageToken: null,
      };
    }

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text === '' ? null : JSON.parse(text);
    } catch {
      parsed = { unparsedBody: text };
    }

    if (!response.ok) {
      return {
        ...base,
        ok: false,
        httpStatus: response.status,
        places: [],
        raw: parsed,
        errorMessage: extractError(parsed) ?? `HTTP ${response.status}`,
        invalidType: looksLikeInvalidType(response.status, parsed),
        nextPageToken: null,
      };
    }

    const data = (parsed ?? {}) as T;
    const places: PlaceResult[] = data.places ?? [];

    return {
      ...base,
      ok: true,
      httpStatus: response.status,
      places,
      raw: parsed,
      errorMessage: null,
      invalidType: false,
      nextPageToken: 'nextPageToken' in data ? (data.nextPageToken ?? null) : null,
    };
  }
}

function extractError(parsed: unknown): string | null {
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const error = (parsed as { error?: { message?: string; status?: string } }).error;
    if (error?.message) return error.status ? `${error.status}: ${error.message}` : error.message;
  }
  return null;
}
