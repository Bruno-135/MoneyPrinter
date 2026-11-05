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

/** Três de cada: uma por versão da mensagem. */
type Tres = readonly [string, string, string];

/**
 * Porque é que um site faz falta a ESTE tipo de negócio, dito como o cliente
 * dele o sente. Vem logo a seguir a «reparei que ainda não têm site próprio».
 * Três por segmento e por país, uma para cada versão da mensagem.
 */
export const PORQUE: Record<Segmento, { PT: Tres; BR: Tres }> = {
  restauracao: {
    PT: [
      'Hoje muita gente escolhe onde comer pelo telemóvel e quer ver a ementa antes de sair de casa.',
      'Quem procura onde comer na zona costuma abrir o site para ver a ementa, os preços e o horário.',
      'Muitos clientes preferem encomendar sem ter de ligar, e um site com a ementa facilita isso.',
    ],
    BR: [
      'Hoje muita gente escolhe onde comer pelo celular e quer ver o cardápio antes de sair de casa.',
      'Quem procura onde comer na região costuma abrir o site pra ver o cardápio, os preços e o horário.',
      'Muitos clientes preferem pedir sem ter que ligar, e um site com o cardápio facilita isso.',
    ],
  },
  beleza: {
    PT: [
      'Antes de marcar, a maioria das pessoas quer ver os trabalhos, os serviços e os preços.',
      'Quem procura estes serviços na zona escolhe muito pelas fotografias dos trabalhos e pela facilidade em marcar.',
      'Um site com os serviços e os preços poupa-vos muitas perguntas repetidas no telefone e nas mensagens.',
    ],
    BR: [
      'Antes de agendar, a maioria das pessoas quer ver os trabalhos, os serviços e os preços.',
      'Quem procura esses serviços na região escolhe muito pelas fotos dos trabalhos e pela facilidade de agendar.',
      'Um site com os serviços e os preços poupa muitas perguntas repetidas no telefone e nas mensagens.',
    ],
  },
  saude: {
    PT: [
      'Quem procura um profissional de saúde quer confirmar as especialidades e o horário antes de marcar.',
      'Um site transmite confiança a quem ainda não vos conhece e facilita a marcação de consultas.',
      'Muitos pacientes pesquisam no Google antes de escolher, e um site próprio faz diferença nessa escolha.',
    ],
    BR: [
      'Quem procura um profissional de saúde quer confirmar as especialidades e o horário antes de agendar.',
      'Um site passa confiança pra quem ainda não conhece vocês e facilita o agendamento de consultas.',
      'Muitos pacientes pesquisam no Google antes de escolher, e um site próprio faz diferença nessa escolha.',
    ],
  },
  fitness: {
    PT: [
      'Quem pensa começar a treinar quer ver as modalidades, os horários e os preços antes de aparecer.',
      'Uma aula experimental fácil de marcar é muitas vezes o empurrão que falta para alguém se inscrever.',
      'Muita gente procura onde treinar perto de casa pelo Google e decide pelo que encontra lá.',
    ],
    BR: [
      'Quem pensa em começar a treinar quer ver as modalidades, os horários e os planos antes de aparecer.',
      'Uma aula experimental fácil de agendar muitas vezes é o empurrão que falta pra alguém se matricular.',
      'Muita gente procura onde treinar perto de casa pelo Google e decide pelo que encontra lá.',
    ],
  },
  ensino: {
    PT: [
      'Os pais e os alunos costumam pesquisar os cursos, os horários e os preços antes de pedir informações.',
      'Um site com os cursos e as turmas responde às perguntas mais comuns antes de vos ligarem.',
      'Muitas inscrições começam por uma pesquisa no Google, e um site próprio ajuda a serem a escolha.',
    ],
    BR: [
      'Os pais e os alunos costumam pesquisar os cursos, os horários e os valores antes de pedir informações.',
      'Um site com os cursos e as turmas responde às perguntas mais comuns antes de ligarem pra vocês.',
      'Muitas matrículas começam por uma pesquisa no Google, e um site próprio ajuda vocês a serem a escolha.',
    ],
  },
  orcamento: {
    PT: [
      'Quem precisa destes serviços quer ver trabalhos feitos e pedir orçamento sem complicações.',
      'Fotografias de trabalhos feitos transmitem confiança a quem ainda não vos conhece.',
      'Muitos pedidos de orçamento começam por uma pesquisa no Google, e quem tem site é mais escolhido.',
    ],
    BR: [
      'Quem precisa desses serviços quer ver trabalhos feitos e pedir orçamento sem complicação.',
      'Fotos de trabalhos feitos passam confiança pra quem ainda não conhece vocês.',
      'Muitos pedidos de orçamento começam por uma pesquisa no Google, e quem tem site é mais escolhido.',
    ],
  },
  escritorio: {
    PT: [
      'Antes de contactar, a maioria dos clientes quer perceber em que áreas trabalham e quem são.',
      'Um site próprio transmite confiança e profissionalismo a quem ainda não vos conhece.',
      'Muitos clientes escolhem pelo que encontram no Google, e um site próprio faz diferença nessa escolha.',
    ],
    BR: [
      'Antes de entrar em contato, a maioria dos clientes quer entender em que áreas vocês atuam e quem são.',
      'Um site próprio passa confiança e profissionalismo pra quem ainda não conhece vocês.',
      'Muitos clientes escolhem pelo que encontram no Google, e um site próprio faz diferença nessa escolha.',
    ],
  },
  loja: {
    PT: [
      'Muita gente quer ver os produtos e confirmar o horário antes de ir à loja.',
      'Um site com os produtos ajuda a vender a quem vos encontra no Google e ainda não vos conhece.',
      'Quem procura uma loja na zona decide muito pelo que encontra na internet.',
    ],
    BR: [
      'Muita gente quer ver os produtos e confirmar o horário antes de ir até a loja.',
      'Um site com os produtos ajuda a vender pra quem encontra vocês no Google e ainda não conhece a loja.',
      'Quem procura uma loja na região decide muito pelo que encontra na internet.',
    ],
  },
  geral: {
    PT: [
      'Hoje muita gente procura no Google antes de escolher, e um site próprio faz diferença nessa escolha.',
      'Um site transmite confiança a quem ainda não vos conhece e facilita que vos contactem.',
      'Quem procura os vossos serviços na zona decide muito pelo que encontra na internet.',
    ],
    BR: [
      'Hoje muita gente procura no Google antes de escolher, e um site próprio faz diferença nessa escolha.',
      'Um site passa confiança pra quem ainda não conhece vocês e facilita que entrem em contato.',
      'Quem procura os serviços de vocês na região decide muito pelo que encontra na internet.',
    ],
  },
};
