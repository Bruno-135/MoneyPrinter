/**
 * Procurar uma cidade pelo nome, em vez de saber as coordenadas de cor.
 *
 * O ecrã pedia latitude, longitude e raio à mão. Ninguém sabe as coordenadas de
 * Barcelinhos, e uma lista fechada de cidades deixa de fora quase todo o país e
 * o Brasil inteiro. Escreve-se o nome, o Google responde, escolhe-se da lista.
 *
 * O raio não se pergunta: vem da área que a própria cidade ocupa no mapa. Uma
 * pessoa a quem se pergunta "raio da zona em metros" está a adivinhar; o Google
 * já sabe onde é que Lisboa acaba e onde é que Fafe acaba, e a resposta traz
 * isso na `viewport`.
 */

import { nomeDoPais } from './paises';

export interface CityMatch {
  /** Identificador do sítio no Google, guardado para referência. */
  placeId: string;
  /** Nome da cidade: "Guimarães". */
  name: string;
  /** Morada completa, que é o que distingue duas cidades com o mesmo nome. */
  address: string;
  latitude: number;
  longitude: number;
  /** Raio que cobre a cidade, calculado a partir da área que ela ocupa. */
  radiusMeters: number;
  countryCode: string;
}

/** Área retangular que o Google devolve à volta de um sítio. */
export interface Viewport {
  low: { latitude: number; longitude: number };
  high: { latitude: number; longitude: number };
}

/** Metros por grau de latitude. Praticamente constante. */
const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Limites do raio da zona.
 *
 * O mínimo evita que uma aldeia pequena dê um raio de trezentos metros e o
 * varrimento falhe metade dela. O máximo é o limite duro do Places — pedir mais
 * do que 50 km devolve um erro — e ao mesmo tempo protege a carteira: São Paulo
 * inteira num varrimento seriam milhares de chamadas.
 */
const MIN_RADIUS_METERS = 1_000;
const MAX_RADIUS_METERS = 25_000;

/**
 * Transforma a área de uma cidade num raio.
 *
 * Usa metade da diagonal do retângulo: um círculo com esse raio cobre a cidade
 * toda. Cobrir a mais é desperdício de chamadas; cobrir a menos é deixar
 * comércios por encontrar, e esse é o erro que custa clientes em vez de cêntimos.
 */
export function radiusFromViewport(viewport: Viewport | null | undefined): number | null {
  if (!viewport) return null;

  const latSpan = Math.abs(viewport.high.latitude - viewport.low.latitude);
  const lngSpan = Math.abs(viewport.high.longitude - viewport.low.longitude);
  if (latSpan === 0 && lngSpan === 0) return null;

  const midLat = (viewport.high.latitude + viewport.low.latitude) / 2;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((midLat * Math.PI) / 180);

  const heightMeters = latSpan * METERS_PER_DEGREE_LAT;
  const widthMeters = lngSpan * metersPerDegreeLng;
  const halfDiagonal = Math.sqrt(heightMeters ** 2 + widthMeters ** 2) / 2;

  return clampRadius(Math.round(halfDiagonal));
}

export function clampRadius(meters: number): number {
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, meters));
}

/**
 * A chave do cache.
 *
 * Sem acentos, sem maiúsculas, sem espaços a mais: "Guimaraes", "guimarães" e
 * "  Guimarães " são a mesma pergunta, e uma pergunta paga não se faz três
 * vezes por causa de um til.
 */
export function normalizeCityQuery(query: string): string {
  return query
    .normalize('NFD')
    // Tira os sinais diacríticos que o NFD separou das letras. A classe está
    // escrita com escapes de propósito: com os caracteres combinantes em cru,
    // o ficheiro fica ilegível em metade dos editores.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A pergunta que se manda ao Google.
 *
 * Leva a palavra "cidade" e o nome do país à frente porque uma pesquisa por
 * "Braga" à seca devolve tanto o concelho como a mercearia que se chama Braga.
 * O que se quer aqui é sempre o sítio, nunca o negócio.
 */
export function cityQueryText(query: string, countryCode: string): string {
  return `cidade de ${query.trim()}, ${nomeDoPais(countryCode)}`;
}
