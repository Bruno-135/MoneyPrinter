/**
 * O que se pede aos bancos de fotografia grátis, ramo a ramo.
 *
 * Três perguntas por ramo em vez de uma, porque um site não precisa de três
 * fotos iguais: precisa de uma vista larga para a abertura, uma do espaço por
 * dentro, e um grande plano do produto. Pedir "padaria" três vezes devolvia a
 * mesma montra três vezes.
 *
 * As perguntas vão em inglês por uma razão prática e não por gosto: os bancos
 * de fotografia grátis têm as imagens etiquetadas em inglês, e uma pergunta em
 * português devolve uma fração dos resultados.
 */

export type Enquadramento = 'capa' | 'interior' | 'detalhe';

export interface ConsultasRamo {
  capa: string;
  interior: string;
  detalhe: string;
}

const PADRAO: ConsultasRamo = {
  capa: 'small local business storefront',
  interior: 'small business interior',
  detalhe: 'workspace details close up',
};

const POR_RAMO: Record<string, ConsultasRamo> = {
  padaria: {
    capa: 'artisan bakery bread display',
    interior: 'bakery shop interior counter',
    detalhe: 'fresh baked bread close up',
  },
  restaurante: {
    capa: 'restaurant dining room table set',
    interior: 'cozy restaurant interior warm light',
    detalhe: 'plated food close up restaurant',
  },
  cabeleireiro: {
    capa: 'hair salon interior chairs',
    interior: 'hairdresser working salon',
    detalhe: 'hair styling close up',
  },
  barbearia: {
    capa: 'barber shop interior',
    interior: 'barber cutting hair shop',
    detalhe: 'barber tools close up',
  },
  'salao-beleza': {
    capa: 'beauty salon interior',
    interior: 'beauty treatment room',
    detalhe: 'manicure close up hands',
  },
  ginasio: {
    capa: 'gym interior equipment',
    interior: 'people training gym',
    detalhe: 'dumbbells close up',
  },
  'pilates-yoga': {
    capa: 'yoga studio interior natural light',
    interior: 'pilates class reformer',
    detalhe: 'yoga mat close up',
  },
  oficina: {
    capa: 'car repair garage workshop',
    interior: 'mechanic working on car',
    detalhe: 'mechanic tools close up',
  },
  'pet-shop': {
    capa: 'pet shop interior',
    interior: 'dog grooming salon',
    detalhe: 'happy dog close up',
  },
  'clinica-dentaria': {
    capa: 'dental clinic interior',
    interior: 'dentist with patient',
    detalhe: 'dental instruments close up',
  },
  fisioterapia: {
    capa: 'physiotherapy clinic room',
    interior: 'physiotherapist treating patient',
    detalhe: 'massage therapy hands close up',
  },
  advogados: {
    capa: 'law office interior',
    interior: 'lawyer working desk documents',
    detalhe: 'law books close up',
  },
  contabilidade: {
    capa: 'accounting office interior',
    interior: 'accountant working desk',
    detalhe: 'financial documents calculator close up',
  },
  'loja-roupa': {
    capa: 'clothing store interior racks',
    interior: 'boutique fitting area',
    detalhe: 'folded clothes close up',
  },
};

export function consultasParaRamo(slug: string | null | undefined): ConsultasRamo {
  if (!slug) return PADRAO;
  return POR_RAMO[slug.trim().toLowerCase()] ?? PADRAO;
}

/**
 * A pergunta para um lugar concreto da página.
 *
 * O `hero` e a `galeria` querem vistas largas, o `sobre` quer o espaço por
 * dentro, os `produtos` querem grande plano. É a única regra aqui e vive num
 * sítio só para os três ecrãs que geram imagens não discordarem entre si.
 */
export function consultaParaSeccao(slug: string | null | undefined, tipo: string): string {
  const consultas = consultasParaRamo(slug);
  switch (tipo) {
    case 'sobre':
    case 'localizacao':
      return consultas.interior;
    case 'produtos':
    case 'servicos':
    case 'cardapio':
      return consultas.detalhe;
    default:
      return consultas.capa;
  }
}
