/**
 * Zonas conhecidas, com as coordenadas já feitas.
 *
 * Existe por causa de um erro de desenho no ecrã de procurar comércios: o nome
 * da zona era uma caixa de texto, e a latitude e a longitude eram outras duas
 * caixas ao lado. Escrever "Porto" no nome não mexia nas coordenadas, e o
 * varrimento continuava a acontecer em Braga — com o resumo a dizer "Porto",
 * que é a pior versão possível do problema: gastar dinheiro no sítio errado e
 * ainda ficar com o rótulo errado na base de dados.
 *
 * Aqui o nome e as coordenadas andam juntos, porque são a mesma coisa. Escolher
 * a cidade escolhe as duas.
 */

export interface Zone {
  /** Identificador estável, usado no `<select>`. */
  id: string;
  /** Nome mostrado, e também o que vai na pesquisa por texto. */
  nome: string;
  lat: number;
  lng: number;
  pais: 'PT' | 'BR';
}

export const ZONES: readonly Zone[] = [
  // Minho — a zona de casa, a que se usa todos os dias.
  { id: 'braga', nome: 'Braga', lat: 41.5454, lng: -8.4265, pais: 'PT' },
  { id: 'guimaraes', nome: 'Guimarães', lat: 41.4425, lng: -8.2918, pais: 'PT' },
  { id: 'barcelos', nome: 'Barcelos', lat: 41.5388, lng: -8.6151, pais: 'PT' },
  { id: 'famalicao', nome: 'Vila Nova de Famalicão', lat: 41.4085, lng: -8.5195, pais: 'PT' },
  { id: 'viana', nome: 'Viana do Castelo', lat: 41.6932, lng: -8.8329, pais: 'PT' },

  // Grande Porto.
  { id: 'porto', nome: 'Porto', lat: 41.1579, lng: -8.6291, pais: 'PT' },
  { id: 'gaia', nome: 'Vila Nova de Gaia', lat: 41.1239, lng: -8.6118, pais: 'PT' },
  { id: 'matosinhos', nome: 'Matosinhos', lat: 41.1844, lng: -8.6907, pais: 'PT' },

  // Resto do país.
  { id: 'aveiro', nome: 'Aveiro', lat: 40.6405, lng: -8.6538, pais: 'PT' },
  { id: 'coimbra', nome: 'Coimbra', lat: 40.2033, lng: -8.4103, pais: 'PT' },
  { id: 'lisboa', nome: 'Lisboa', lat: 38.7223, lng: -9.1393, pais: 'PT' },
  { id: 'faro', nome: 'Faro', lat: 37.0194, lng: -7.9304, pais: 'PT' },

  // Brasil.
  { id: 'sao-paulo', nome: 'São Paulo', lat: -23.5505, lng: -46.6333, pais: 'BR' },
  { id: 'rio', nome: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, pais: 'BR' },
  { id: 'belo-horizonte', nome: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, pais: 'BR' },
  { id: 'curitiba', nome: 'Curitiba', lat: -25.4284, lng: -49.2733, pais: 'BR' },
  { id: 'porto-alegre', nome: 'Porto Alegre', lat: -30.0346, lng: -51.2177, pais: 'BR' },
  { id: 'brasilia', nome: 'Brasília', lat: -15.7939, lng: -47.8828, pais: 'BR' },
  { id: 'salvador', nome: 'Salvador', lat: -12.9777, lng: -38.5016, pais: 'BR' },
  { id: 'fortaleza', nome: 'Fortaleza', lat: -3.7319, lng: -38.5267, pais: 'BR' },
];

/** Valor do `<select>` quando as coordenadas se escrevem à mão. */
export const CUSTOM_ZONE = 'outra';

export const DEFAULT_ZONE = 'braga';

export function findZone(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

/**
 * Caixas onde cada país cabe, para os testes.
 *
 * Só o continente: as ilhas ficam de fora de propósito, e se algum dia
 * entrarem na lista é aqui que se alarga a caixa — com a pessoa a ver que o
 * está a fazer, em vez de um par de coordenadas trocadas passar sem ninguém
 * reparar.
 */
export const COUNTRY_BOUNDS: Record<Zone['pais'], { lat: [number, number]; lng: [number, number] }> = {
  PT: { lat: [36.9, 42.2], lng: [-9.6, -6.1] },
  BR: { lat: [-34.0, 5.3], lng: [-74.1, -34.7] },
};
