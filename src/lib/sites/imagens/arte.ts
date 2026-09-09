/**
 * Imagens geradas, uma por comércio e por lugar da página.
 *
 * Um comércio que ainda não deu fotografias tem de ter um site que já se
 * aguenta — senão o que se lhe mostra é uma página com buracos cinzentos, e
 * ninguém compra isso. Estas imagens são desenhadas em SVG a partir do nome do
 * negócio: camadas de gradiente quentes ou frias conforme o ramo, com o grão de
 * uma fotografia por cima. Não são fotografias e não fingem ser — mas ocupam o
 * mesmo espaço, com a mesma cor, e a página lê-se inteira.
 *
 * Duas propriedades que interessam:
 *
 *  - DETERMINISTAS. A mesma semente dá sempre exatamente a mesma imagem. O que
 *    o comerciante viu no PDF é o que fica no site, e o browser pode guardá-las
 *    para sempre.
 *  - SEM FICHEIROS. Não há nada para carregar, alojar ou pagar. O SVG inteiro
 *    são dois kilobytes de texto gerados no pedido.
 *
 * Quando o comerciante der fotografias a sério, substituem estas uma a uma.
 */

/** As famílias de cor. Um ramo escolhe uma; o resto do desenho é igual. */
export interface Paleta {
  /** O fundo, sobre o qual as camadas são pintadas. */
  base: string;
  /** Três camadas de luz, da mais clara para a mais escura. */
  camadas: readonly [string, string, string];
}

export const PALETAS = {
  // Pão, massa, forno: o castanho dourado.
  padaria: { base: '#241609', camadas: ['#E8B978', '#A56A2E', '#5A3417'] },
  // Café torrado, leite, madeira.
  cafe: { base: '#1E140D', camadas: ['#D6AE81', '#8A5A32', '#472B18'] },
  // Sala de jantar à noite: quente e fechado.
  restaurante: { base: '#1A1210', camadas: ['#D98A57', '#8C3F2A', '#3E1D16'] },
  // Cabeleireiro e estética: rosa esfumado e ameixa.
  beleza: { base: '#22131C', camadas: ['#F0CBD6', '#B27089', '#5C3245' ] },
  // Barbearia: aço, azul frio, contraste duro.
  barbearia: { base: '#12161C', camadas: ['#A8BACC', '#4A5F78', '#22303F'] },
  // Ginásio: verde elétrico sobre preto.
  ginasio: { base: '#0C1512', camadas: ['#7FE6BC', '#2E9C74', '#134736'] },
  // Pilates e yoga: lavanda calma.
  calma: { base: '#161327', camadas: ['#DCD3F5', '#8A79C8', '#3F3470'] },
  // Oficina: âmbar industrial sobre grafite.
  oficina: { base: '#14120F', camadas: ['#F0AE45', '#9A6620', '#453118'] },
  // Pet shop: verde folha, alegre.
  animais: { base: '#101B14', camadas: ['#A8E0B4', '#4E9E68', '#1F4C31'] },
  // Clínicas: azul limpo.
  clinica: { base: '#0C1620', camadas: ['#BCE0F5', '#4E8FBC', '#1E4A6B'] },
  // Escritórios: azul-marinho com dourado.
  escritorio: { base: '#11151C', camadas: ['#D6C08A', '#5A6478', '#242C3A'] },
  // Loja: neutro quente, tecido.
  loja: { base: '#1C1713', camadas: ['#E6D6C2', '#A08872', '#4E4036'] },
  // O que não cai em nenhuma das outras.
  neutro: { base: '#15181D', camadas: ['#D3D8E0', '#7A8494', '#333B47'] },
} as const satisfies Record<string, Paleta>;

export type Familia = keyof typeof PALETAS;

/** Ramo → família de cor. O que não estiver aqui fica no neutro. */
const FAMILIA_POR_RAMO: Record<string, Familia> = {
  padaria: 'padaria',
  restaurante: 'restaurante',
  cabeleireiro: 'beleza',
  'salao-beleza': 'beleza',
  barbearia: 'barbearia',
  ginasio: 'ginasio',
  'pilates-yoga': 'calma',
  oficina: 'oficina',
  'pet-shop': 'animais',
  'clinica-dentaria': 'clinica',
  fisioterapia: 'clinica',
  advogados: 'escritorio',
  contabilidade: 'escritorio',
  'loja-roupa': 'loja',
};

export function familiaParaRamo(slug: string | null | undefined): Familia {
  if (!slug) return 'neutro';
  return FAMILIA_POR_RAMO[slug.trim().toLowerCase()] ?? 'neutro';
}

export function ehFamilia(valor: string): valor is Familia {
  return Object.prototype.hasOwnProperty.call(PALETAS, valor);
}

// ---------------------------------------------------------------------------
// O acaso determinado
// ---------------------------------------------------------------------------

/** FNV-1a de 32 bits. Espalha bem e cabe em cinco linhas. */
function baralhar(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: gerador pequeno, sempre igual para a mesma semente. */
function gerador(semente: number): () => number {
  let estado = semente || 1;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// O desenho
// ---------------------------------------------------------------------------

const LARGURA = 1200;
const ALTURA = 800;

/** Uma mancha de luz: onde está, que tamanho tem e de que cor é. */
interface Mancha {
  cx: number;
  cy: number;
  r: number;
  cor: string;
  opacidade: number;
}

function mancha(rand: () => number, cor: string, indice: number): Mancha {
  // Cada camada tem a sua zona do quadro, para não caírem todas em cima umas
  // das outras — é isso que faria a imagem parecer uma bola desfocada.
  const zonas = [
    { x: [0.55, 0.85], y: [0.1, 0.4] },
    { x: [0.05, 0.4], y: [0.6, 0.95] },
    { x: [0.25, 0.75], y: [0.3, 0.7] },
  ][indice % 3]!;

  return {
    cx: Math.round((zonas.x[0]! + rand() * (zonas.x[1]! - zonas.x[0]!)) * LARGURA),
    cy: Math.round((zonas.y[0]! + rand() * (zonas.y[1]! - zonas.y[0]!)) * ALTURA),
    r: Math.round((0.45 + rand() * 0.35) * LARGURA),
    cor,
    opacidade: Number((0.55 + rand() * 0.35).toFixed(2)),
  };
}

/**
 * O SVG completo, como texto.
 *
 * `preserveAspectRatio="slice"` faz a imagem preencher qualquer caixa sem
 * deformar, como faz uma fotografia com `object-fit: cover` — que é
 * exatamente o comportamento que o desenho das páginas espera.
 */
export function arteSvg(familia: Familia, semente: string): string {
  const paleta = PALETAS[familia];
  const rand = gerador(baralhar(`${familia}:${semente}`));
  const manchas = paleta.camadas.map((cor, i) => mancha(rand, cor, i));
  const angulo = Math.round(120 + rand() * 90);

  const defs = manchas
    .map(
      (m, i) =>
        `<radialGradient id="m${i}" cx="${m.cx}" cy="${m.cy}" r="${m.r}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${m.cor}" stop-opacity="${m.opacidade}"/>` +
        `<stop offset="1" stop-color="${m.cor}" stop-opacity="0"/>` +
        `</radialGradient>`,
    )
    .join('');

  const camadas = manchas.map((_, i) => `<rect width="100%" height="100%" fill="url(#m${i})"/>`).join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA} ${ALTURA}" ` +
    `preserveAspectRatio="xMidYMid slice" width="${LARGURA}" height="${ALTURA}">` +
    `<defs>${defs}` +
    // Uma inclinação de luz por cima de tudo, para o quadro ter um lado mais
    // claro do que o outro como tem qualquer fotografia.
    `<linearGradient id="luz" gradientTransform="rotate(${angulo} 0.5 0.5)">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>` +
    `<stop offset="1" stop-color="#000000" stop-opacity="0.22"/>` +
    `</linearGradient>` +
    // O grão. É o que impede isto de parecer um botão de CSS: uma fotografia
    // tem ruído, um gradiente puro não tem.
    `<filter id="grao" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${baralhar(semente) % 1000}"/>` +
    `<feColorMatrix type="saturate" values="0"/>` +
    `</filter>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="${paleta.base}"/>` +
    camadas +
    `<rect width="100%" height="100%" fill="url(#luz)"/>` +
    `<rect width="100%" height="100%" filter="url(#grao)" opacity="0.09"/>` +
    `</svg>`
  );
}

/**
 * O endereço da imagem, para pôr num `src`.
 *
 * A semente vai no caminho e não numa query string de propósito: assim a
 * imagem é um recurso com endereço próprio, que a cache do browser, o Next e
 * a rede de distribuição guardam sem pensar duas vezes.
 */
export function arteUrl(familia: Familia, semente: string): string {
  return `/arte/${familia}/${encodeURIComponent(limparSemente(semente))}.svg`;
}

/**
 * A semente vai para dentro de um URL, por isso reduz-se ao que é seguro lá:
 * letras sem acento, números e hífenes. Continua a ser única por comércio e
 * por lugar da página, que é tudo o que se lhe pede.
 */
export function limparSemente(valor: string): string {
  const limpo = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return limpo || 'sem-nome';
}
