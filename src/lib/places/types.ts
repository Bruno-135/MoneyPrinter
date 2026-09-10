/**
 * Tipos da Google Places API (New).
 *
 * Só estão aqui os campos que o `fieldMask` pede — pedir campos a mais custa
 * dinheiro sem trazer nada, porque o escalão de preço é determinado pelo campo
 * mais caro da máscara.
 */

/** Um resultado do Places, limitado aos campos que pedimos. */
export interface PlaceResult {
  id: string;
  displayName?: { text?: string; languageCode?: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude?: number; longitude?: number };
  /** Área que o sítio ocupa no mapa. Pedida só na procura de cidades: é ela
   *  que dá o raio do varrimento sem ser preciso perguntá-lo a ninguém. */
  viewport?: {
    low?: { latitude?: number; longitude?: number };
    high?: { latitude?: number; longitude?: number };
  };
  businessStatus?: string;

  /**
   * Fotografias do próprio comércio, tiradas por clientes ou pelo dono.
   *
   * O que vem aqui NÃO é a imagem: é o nome dela, que depois se troca por um
   * endereço temporário. As atribuições vêm agarradas porque mostrá-las é
   * condição de uso — uma foto do Google sem o crédito de quem a tirou não se
   * pode publicar.
   */
  photos?: PlacePhoto[];

  // Campos do escalão Enterprise — são estes que determinam o preço.
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: unknown;
}

export interface PlacePhotoAttribution {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

export interface PlacePhoto {
  /** Identificador da foto, no formato `places/XXX/photos/YYY`. */
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: PlacePhotoAttribution[];
}

export interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface SearchNearbyResponse {
  places?: PlaceResult[];
}

export interface SearchTextResponse {
  places?: PlaceResult[];
  nextPageToken?: string;
}

/** Resultado de uma chamada, já com o que é preciso para gravar e contabilizar. */
export interface PlacesCallResult {
  ok: boolean;
  httpStatus: number;
  places: PlaceResult[];
  /** Corpo completo da resposta, para gravar em `response_raw`. */
  raw: unknown;
  /** Parâmetros enviados, para gravar em `request_params`. */
  requestParams: unknown;
  endpoint: string;
  errorMessage: string | null;
  /**
   * true quando a Google rejeitou o pedido por causa de um tipo desconhecido.
   * Estas respostas não são faturadas e são o sinal para passar à pesquisa
   * por texto.
   */
  invalidType: boolean;
  nextPageToken: string | null;
}
