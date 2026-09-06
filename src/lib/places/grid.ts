/**
 * Geração da grelha de pontos que cobre uma região.
 *
 * O problema que isto resolve: a pesquisa por proximidade do Places devolve no
 * máximo 20 resultados e não tem paginação. Uma chamada por cidade devolve 20
 * restaurantes e finge que acabou. Para cobrir a área toda é preciso partir a
 * região em círculos pequenos e procurar em cada um.
 *
 * Usa-se um arranjo hexagonal: círculos de raio `r` com centros espaçados de
 * `r·√3` cobrem o plano inteiro sem buracos. Uma grelha quadrada também cobre,
 * mas precisa de ~15% mais pontos — e cada ponto é uma chamada paga.
 */

/** Raio médio da Terra, em metros. */
const EARTH_RADIUS_M = 6_371_008.8;

/** Fator de espaçamento entre centros para cobertura hexagonal sem falhas. */
const HEX_SPACING = Math.sqrt(3);

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GridCell extends LatLng {
  /** Raio de pesquisa desta célula, em metros. */
  radiusMeters: number;
  /**
   * Identificador estável da célula dentro da região. É esta a chave que
   * impede pagar duas vezes pela mesma pesquisa: fica gravada em
   * `region_searches.grid_cell_key`, com um índice único.
   */
  key: string;
}

export interface GridOptions {
  /** Centro da região a cobrir. */
  center: LatLng;
  /** Raio da região, em metros. */
  regionRadiusMeters: number;
  /** Raio de cada pesquisa, em metros. Entre 1000 e 2000 na prática. */
  cellRadiusMeters: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância entre dois pontos pela fórmula de haversine, em metros.
 *
 * Chega e sobra nesta escala: o erro face a um modelo elipsoidal é da ordem de
 * 0,3%, ou seja, uns metros num raio de 2 km.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Metros por grau de latitude. Praticamente constante. */
function metersPerDegreeLat(): number {
  return (Math.PI * EARTH_RADIUS_M) / 180;
}

/**
 * Metros por grau de longitude à latitude dada.
 *
 * Encolhe com o cosseno da latitude: em Braga (41°N) um grau de longitude vale
 * ~84 km, contra ~111 km no equador. Ignorar isto faria a grelha ficar esticada
 * no sentido leste-oeste e deixaria buracos por cobrir.
 */
function metersPerDegreeLng(lat: number): number {
  return metersPerDegreeLat() * Math.cos(toRadians(lat));
}

/**
 * Chave estável de uma célula: coordenadas a 4 casas decimais (~11 m) mais o
 * raio. Duas execuções com os mesmos parâmetros produzem exatamente as mesmas
 * chaves, que é o que permite reconhecer as células já pesquisadas.
 */
export function cellKey(lat: number, lng: number, radiusMeters: number): string {
  return `${lat.toFixed(4)}|${lng.toFixed(4)}|${Math.round(radiusMeters)}`;
}

/**
 * Gera os pontos de pesquisa que cobrem a região.
 *
 * Devolve sempre pelo menos uma célula (o próprio centro), mesmo quando a
 * região é menor do que uma célula.
 */
export function buildGrid(options: GridOptions): GridCell[] {
  const { center, regionRadiusMeters, cellRadiusMeters } = options;

  if (!Number.isFinite(center.lat) || center.lat < -90 || center.lat > 90) {
    throw new Error(`Latitude inválida: ${center.lat}`);
  }
  if (!Number.isFinite(center.lng) || center.lng < -180 || center.lng > 180) {
    throw new Error(`Longitude inválida: ${center.lng}`);
  }
  if (cellRadiusMeters <= 0) {
    throw new Error(`Raio da célula tem de ser positivo (recebido: ${cellRadiusMeters})`);
  }
  if (regionRadiusMeters <= 0) {
    throw new Error(`Raio da região tem de ser positivo (recebido: ${regionRadiusMeters})`);
  }

  // Uma região que cabe numa célula resolve-se com uma única pesquisa.
  if (regionRadiusMeters <= cellRadiusMeters) {
    return [
      {
        lat: center.lat,
        lng: center.lng,
        radiusMeters: cellRadiusMeters,
        key: cellKey(center.lat, center.lng, cellRadiusMeters),
      },
    ];
  }

  const spacing = cellRadiusMeters * HEX_SPACING;
  const rowHeight = (spacing * Math.sqrt(3)) / 2;

  const mPerLat = metersPerDegreeLat();
  const mPerLng = metersPerDegreeLng(center.lat);

  // Quantas filas e colunas são precisas para o círculo caber na malha. Uma
  // fila extra de folga em cada sentido garante que a orla fica coberta.
  const rows = Math.ceil(regionRadiusMeters / rowHeight) + 1;
  const cols = Math.ceil(regionRadiusMeters / spacing) + 1;

  const cells: GridCell[] = [];
  const seen = new Set<string>();

  for (let row = -rows; row <= rows; row++) {
    // Filas ímpares deslocam-se meio passo: é o que faz o arranjo hexagonal.
    const offset = row % 2 === 0 ? 0 : spacing / 2;

    for (let col = -cols; col <= cols; col++) {
      const northMeters = row * rowHeight;
      const eastMeters = col * spacing + offset;

      const lat = center.lat + northMeters / mPerLat;
      const lng = center.lng + eastMeters / mPerLng;

      // Fora da região? O centro da célula pode cair fora e a célula ainda
      // apanhar parte da região, daí a tolerância de um raio de célula.
      const point = { lat, lng };
      if (distanceMeters(center, point) > regionRadiusMeters + cellRadiusMeters) {
        continue;
      }

      const key = cellKey(lat, lng, cellRadiusMeters);
      if (seen.has(key)) continue;
      seen.add(key);

      cells.push({ lat, lng, radiusMeters: cellRadiusMeters, key });
    }
  }

  // Ordenar do centro para fora: se um varrimento for interrompido ou atingir o
  // limite de chamadas, o que ficou feito é a zona mais densa, não uma orla.
  cells.sort((a, b) => distanceMeters(center, a) - distanceMeters(center, b));

  return cells;
}
