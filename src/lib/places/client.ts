import type {
  PlaceResult,
  PlacesCallResult,
  SearchNearbyResponse,
  SearchTextResponse,
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
 * Deixámos de fora, de propósito: `photos` (não mostramos fotos do Google),
 * `reviews` e `editorialSummary` (escalão Enterprise + Atmosphere, mais caro).
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
].join(',');

const TEXT_FIELD_MASK = `${FIELD_MASK},nextPageToken`;

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
 * Sinais de que a Google rejeitou o pedido por causa de um tipo desconhecido.
 * Estas respostas (400) não são faturadas.
 */
function looksLikeInvalidType(status: number, body: string): boolean {
  if (status !== 400) return false;
  const lower = body.toLowerCase();
  return lower.includes('included_types') || lower.includes('includedtypes') || lower.includes('type');
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
        invalidType: looksLikeInvalidType(response.status, text),
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
