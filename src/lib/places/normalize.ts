import type { AddressComponent, PlaceResult } from './types';
import { classifyWebsite, socialLinksFrom } from './website';
import { normalizePhone } from './phone';

/**
 * Converte um resultado do Places numa linha pronta para `businesses`.
 *
 * Regra que atravessa este ficheiro: o que não vier da API fica `null`. Nunca
 * se inventa nem se deduz — um telefone deduzido errado faz perder uma venda
 * quando alguém ligar para o número errado.
 */

export interface NormalizedBusiness {
  google_place_id: string;
  name: string;
  business_category: string;
  google_types: string[];

  formatted_address: string | null;
  street: string | null;
  street_number: string | null;
  postal_code: string | null;
  locality: string | null;
  admin_area: string | null;
  country_code: string;

  latitude: number | null;
  longitude: number | null;

  phone_raw: string | null;
  phone_e164: string | null;
  phone_country_code: string | null;
  phone_country: string | null;

  website_url: string | null;
  social_links: Record<string, string>;

  rating: number | null;
  reviews_count: number | null;
  price_level: number | null;
  business_status: string | null;
  opening_hours: unknown;

  google_raw: PlaceResult;
}

/** Primeiro componente da morada que tenha o tipo pedido. */
function component(components: AddressComponent[] | undefined, type: string): AddressComponent | null {
  return components?.find((c) => c.types?.includes(type)) ?? null;
}

/**
 * O Places devolve o nível de preço como texto (`PRICE_LEVEL_MODERATE`), mas a
 * coluna é um inteiro de 0 a 4.
 */
const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export interface NormalizeOptions {
  /** Rótulo do ramo, para gravar em `business_category`. */
  categoryLabel: string;
  /** País da região pesquisada, usado quando a morada não o traz. */
  fallbackCountryCode: string;
}

export function normalizePlace(
  place: PlaceResult,
  options: NormalizeOptions,
): NormalizedBusiness | null {
  const id = place.id?.trim();
  const name = place.displayName?.text?.trim();

  // Sem identificador ou sem nome não há linha possível: as duas colunas são
  // obrigatórias e a de-duplicação assenta no place id.
  if (!id || !name) return null;

  const components = place.addressComponents;

  const countryComponent = component(components, 'country');
  const countryCode =
    countryComponent?.shortText?.toUpperCase() ?? options.fallbackCountryCode.toUpperCase();

  // O telefone nacional é o que se mostra; o internacional é mais fiável para
  // normalizar. Tenta-se o internacional primeiro e guarda-se o nacional em bruto.
  const phoneSource = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
  const phone = normalizePhone(phoneSource, countryCode);

  const websiteUrl = place.websiteUri?.trim() || null;

  return {
    google_place_id: id,
    name,
    business_category: options.categoryLabel,
    google_types: place.types ?? [],

    formatted_address: place.formattedAddress?.trim() ?? null,
    street: component(components, 'route')?.longText ?? null,
    street_number: component(components, 'street_number')?.longText ?? null,
    postal_code: component(components, 'postal_code')?.longText ?? null,
    locality:
      component(components, 'locality')?.longText ??
      component(components, 'postal_town')?.longText ??
      component(components, 'administrative_area_level_2')?.longText ??
      null,
    admin_area: component(components, 'administrative_area_level_1')?.longText ?? null,
    country_code: /^[A-Z]{2}$/.test(countryCode) ? countryCode : options.fallbackCountryCode.toUpperCase(),

    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,

    // `phone_raw` guarda o nacional, que é o formato que se lê ao telefone.
    phone_raw: place.nationalPhoneNumber?.trim() ?? phone.raw,
    phone_e164: phone.e164,
    phone_country_code: phone.countryCode,
    phone_country: phone.country,

    website_url: websiteUrl,
    social_links: socialLinksFrom(websiteUrl),

    rating: typeof place.rating === 'number' ? place.rating : null,
    reviews_count: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    price_level: place.priceLevel ? (PRICE_LEVELS[place.priceLevel] ?? null) : null,
    business_status: place.businessStatus ?? null,
    opening_hours: place.regularOpeningHours ?? null,

    google_raw: place,
  };
}

/** Reexportada por conveniência: quem normaliza costuma querer classificar. */
export { classifyWebsite };
