/**
 * A chave que identifica um varrimento (zona + ramo).
 *
 * A base de dados calcula-a sozinha, numa coluna gerada em `searched_regions`
 * (migração 0002), e tem uma restrição única sobre ela. Esta função reproduz
 * essa mesma expressão em TypeScript, para a aplicação poder PROCURAR a linha
 * existente pela mesma chave por que a base de dados a vai recusar.
 *
 * Existe por causa de um bug caro: o código procurava a região existente por
 * ramo + país + raio, e mais nada. Faltavam a localidade e as coordenadas. O
 * efeito, ao procurar padarias no Porto depois de já ter procurado padarias em
 * Braga, era este: encontrava a linha de Braga, dava-lhe o rótulo "Porto",
 * ficava a apontar para os 111 comércios de Braga, e o cache — que agora
 * julgava o Porto já pesquisado — recusava-se a fazer a busca. Um varrimento
 * que nunca aconteceu, com o nome errado por cima.
 *
 * A expressão da base de dados, para comparar:
 *
 *   lower(country_code)
 *     || '|' || coalesce(lower(btrim(locality)), '')
 *     || '|' || coalesce(round(center_lat, 4)::text, '')
 *     || '|' || coalesce(round(center_lng, 4)::text, '')
 *     || '|' || coalesce(radius_meters::text, '')
 *     || '|' || lower(btrim(business_category))
 */

export interface RegionKeyParts {
  countryCode: string;
  locality: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category: string;
}

/**
 * `round(numeric, 4)::text` no Postgres mantém as casas decimais: 41.54 sai
 * como "41.5400", e não "41.54". `toFixed(4)` faz o mesmo, e é por isso que
 * está aqui em vez de um `Math.round` que daria "41.54" e nunca encontraria a
 * linha.
 */
function coord(value: number): string {
  return value.toFixed(4);
}

export function regionSearchKey(parts: RegionKeyParts): string {
  return [
    parts.countryCode.trim().toLowerCase(),
    (parts.locality ?? '').trim().toLowerCase(),
    coord(parts.latitude),
    coord(parts.longitude),
    String(parts.radiusMeters),
    parts.category.trim().toLowerCase(),
  ].join('|');
}
