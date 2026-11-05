import { findCategory } from '@/lib/places/categories';

/**
 * Os segmentos da primeira mensagem de WhatsApp.
 *
 * Os quarenta e tal ramos do Places juntam-se em oito segmentos, pelo que o
 * cliente de cada um procura no site e pelo que o botão do WhatsApp lhe deixa
 * fazer: num restaurante encomenda-se, num salão marca-se, a um canalizador
 * pede-se orçamento. A mensagem muda só nessa frase, a da proposta: o resto é
 * igual para todos, e é o resto que diz quem somos.
 *
 * Um ramo que não esteja aqui cai em `geral`, que serve a qualquer negócio. O
 * teste obriga a pôr cada ramo novo num segmento, para não ficar em `geral`
 * por esquecimento.
 */

export const SEGMENTOS = [
  'restauracao',
  'beleza',
  'saude',
  'fitness',
  'ensino',
  'orcamento',
  'escritorio',
  'loja',
  'geral',
] as const;

export type Segmento = (typeof SEGMENTOS)[number];

export const SEGMENTO_DO_RAMO: Record<string, Segmento> = {
  // Comer: a ementa e a encomenda.
  restaurante: 'restauracao',
  padaria: 'restauracao',

  // Beleza e estética: os serviços, os trabalhos e a marcação.
  cabeleireiro: 'beleza',
  barbearia: 'beleza',
  'salao-beleza': 'beleza',
  'clinica-estetica': 'beleza',
  'harmonizacao-facial': 'beleza',
  'depilacao-laser': 'beleza',
  micropigmentacao: 'beleza',
  manicure: 'beleza',
  massagem: 'beleza',
  tatuagem: 'beleza',

  // Saúde: as especialidades e a consulta.
  'clinica-dentaria': 'saude',
  fisioterapia: 'saude',
  medico: 'saude',
  veterinario: 'saude',
  nutricionista: 'saude',
  podologia: 'saude',
  psicologo: 'saude',
  optica: 'saude',

  // Exercício: as aulas e a aula experimental.
  ginasio: 'fitness',
  'pilates-yoga': 'fitness',
  'personal-trainer': 'fitness',

  // Escolas: os cursos e o pedido de informações.
  'escola-conducao': 'ensino',
  'escola-musica': 'ensino',
  'escola-danca': 'ensino',
  'escola-teatro': 'ensino',
  'escola-linguas': 'ensino',

  // Quem vai a casa do cliente ou faz por encomenda: os trabalhos e o orçamento.
  oficina: 'orcamento',
  eletricista: 'orcamento',
  canalizador: 'orcamento',
  construtora: 'orcamento',
  pintor: 'orcamento',
  'anti-incendio': 'orcamento',
  arquiteto: 'orcamento',
  fotografo: 'orcamento',
  mudancas: 'orcamento',
  transportadora: 'orcamento',
  entregas: 'orcamento',

  // Escritórios: as áreas, a equipa e a reunião.
  advogados: 'escritorio',
  contabilidade: 'escritorio',
  seguros: 'escritorio',
  imobiliaria: 'escritorio',
  'agencia-viagens': 'escritorio',

  // Lojas: os produtos.
  'loja-roupa': 'loja',
  'pet-shop': 'loja',
  'materiais-construcao': 'loja',
  'aluguer-viaturas': 'loja',
};

/** O segmento de um ramo, aceite como slug ou como nome. */
export function segmentoDoRamo(ramo: string | null | undefined): Segmento {
  if (!ramo) return 'geral';
  const slug = findCategory(ramo)?.slug ?? ramo;
  return SEGMENTO_DO_RAMO[slug] ?? 'geral';
}

/**
 * O que vai no site e o que o botão faz, por segmento e por país. Entra a
 * seguir a «eu monto o site primeiro, ».
 */
export const O_QUE_LEVA: Record<Segmento, { PT: string; BR: string }> = {
  restauracao: {
    PT: 'com a ementa e os preços, horário, localização e botão para encomendar pelo WhatsApp',
    BR: 'com o cardápio e os preços, horário, localização e botão pra fazer pedido pelo WhatsApp',
  },
  beleza: {
    PT: 'com os serviços e os preços, fotografias dos vossos trabalhos, horário e botão para marcar pelo WhatsApp',
    BR: 'com os serviços e os preços, fotos dos trabalhos de vocês, horário e botão pra agendar pelo WhatsApp',
  },
  saude: {
    PT: 'com as especialidades e os serviços, horário, localização e botão para marcar consulta pelo WhatsApp',
    BR: 'com as especialidades e os serviços, horário, localização e botão pra agendar consulta pelo WhatsApp',
  },
  fitness: {
    PT: 'com as modalidades, o horário das aulas, os preços e botão para marcar uma aula experimental pelo WhatsApp',
    BR: 'com as modalidades, os horários das aulas, os planos e botão pra agendar uma aula experimental pelo WhatsApp',
  },
  ensino: {
    PT: 'com os cursos e as turmas, horários, localização e botão para pedir informações pelo WhatsApp',
    BR: 'com os cursos e as turmas, horários, localização e botão pra pedir informações pelo WhatsApp',
  },
  orcamento: {
    PT: 'com os serviços, fotografias de trabalhos feitos, a zona onde trabalham e botão para pedir orçamento pelo WhatsApp',
    BR: 'com os serviços, fotos de trabalhos feitos, a região onde vocês atendem e botão pra pedir orçamento pelo WhatsApp',
  },
  escritorio: {
    PT: 'com as áreas em que trabalham, a equipa, localização e botão para marcar uma reunião pelo WhatsApp',
    BR: 'com as áreas em que vocês atuam, a equipe, localização e botão pra marcar uma reunião pelo WhatsApp',
  },
  loja: {
    PT: 'com os produtos, horário, localização e botão para falar pelo WhatsApp',
    BR: 'com os produtos, horário, localização e botão pra falar pelo WhatsApp',
  },
  geral: {
    PT: 'com os vossos serviços, horário, localização e botão para falar pelo WhatsApp',
    BR: 'com os serviços de vocês, horário, localização e botão pra falar pelo WhatsApp',
  },
};
