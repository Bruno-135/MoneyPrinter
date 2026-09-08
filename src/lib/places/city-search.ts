import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PlacesClient } from './client';
import type { PlaceResult } from './types';
import { cityQueryText, normalizeCityQuery, radiusFromViewport, type CityMatch } from './cities';

/**
 * Procurar uma cidade, pagando no máximo uma vez por pergunta.
 *
 * A regra desta casa é que uma consulta paga nunca se repete. Aqui isso é
 * literal: antes de falar com o Google, olha-se para `city_lookups`. Escrever
 * "Guimarães" pela segunda vez não custa nada, nem no dia seguinte nem daqui a
 * um mês — uma cidade não muda de sítio.
 */

type Db = SupabaseClient<Database>;

export interface CitySearchResult {
  cities: CityMatch[];
  /** true quando a resposta veio do cache e não custou nada. */
  fromCache: boolean;
  error: string | null;
}

/**
 * Tipos que valem como sítio onde se procura comércio.
 *
 * Uma pesquisa por "Braga" devolve o concelho, mas também pode devolver uma
 * estação de comboios ou um restaurante chamado Braga. Filtra-se pelo tipo,
 * que é de graça, em vez de pedir à Google que filtre, que limitaria de mais.
 */
const PLACE_TYPES = new Set([
  'locality',
  'sublocality',
  'sublocality_level_1',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'postal_town',
  'neighborhood',
  'political',
]);

function toCityMatch(place: PlaceResult, countryCode: string): CityMatch | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

  const viewport =
    place.viewport?.low?.latitude !== undefined &&
    place.viewport?.low?.longitude !== undefined &&
    place.viewport?.high?.latitude !== undefined &&
    place.viewport?.high?.longitude !== undefined
      ? {
          low: { latitude: place.viewport.low.latitude, longitude: place.viewport.low.longitude },
          high: { latitude: place.viewport.high.latitude, longitude: place.viewport.high.longitude },
        }
      : null;

  return {
    placeId: place.id,
    name: place.displayName?.text ?? place.formattedAddress ?? 'Sem nome',
    address: place.formattedAddress ?? '',
    latitude,
    longitude,
    // Sem área conhecida ficam 5 km, que cobre uma vila inteira e o centro de
    // uma cidade média. É um valor assumido, e é por isso que aparece no ecrã:
    // quem carrega no botão vê o raio antes de gastar.
    radiusMeters: radiusFromViewport(viewport) ?? 5_000,
    countryCode,
  };
}

/** Só interessam sítios; um restaurante com nome de cidade não serve. */
function isPlaceLikeCity(place: PlaceResult): boolean {
  return (place.types ?? []).some((type) => PLACE_TYPES.has(type));
}

export async function searchCities(
  db: Db,
  places: PlacesClient,
  query: string,
  countryCode: string,
): Promise<CitySearchResult> {
  const key = normalizeCityQuery(query);
  const country = countryCode.toUpperCase();

  if (key.length < 2) {
    return { cities: [], fromCache: true, error: 'Escreve pelo menos duas letras.' };
  }

  const { data: cached } = await db
    .from('city_lookups')
    .select('results')
    .eq('query_key', key)
    .eq('country_code', country)
    .maybeSingle();

  if (cached) {
    return { cities: (cached.results ?? []) as unknown as CityMatch[], fromCache: true, error: null };
  }

  const result = await places.searchCity(cityQueryText(query, country));

  if (!result.ok) {
    // Uma falha NÃO se grava. Gravá-la significaria que a próxima tentativa
    // devolvia a mesma lista vazia sem sequer tentar — o mesmo erro que já
    // aconteceu neste projeto com as regiões.
    return {
      cities: [],
      fromCache: false,
      error: result.errorMessage ?? 'A Google não respondeu à procura da cidade.',
    };
  }

  const cities = result.places
    .filter(isPlaceLikeCity)
    .map((place) => toCityMatch(place, country))
    .filter((city): city is CityMatch => city !== null)
    // Cinco chegam para escolher. Mais do que isso é uma lista para ler em vez
    // de uma escolha para fazer.
    .slice(0, 5);

  await db.from('city_lookups').insert({
    query_key: key,
    query_text: query.trim(),
    country_code: country,
    results: cities as never,
    results_count: cities.length,
  });

  return { cities, fromCache: false, error: null };
}
