import type { SiteTemplate } from './types';
import { buildDemo, type DemoSeed } from './demo';

/**
 * Os modelos vindos do Claude Design.
 *
 * Estes dois não nasceram aqui: foram desenhados à mão, artboard a artboard,
 * com folha de sistema própria — escala tipográfica, grelha, espaçamento e
 * contraste medido. As paletas `forno` e `clinica` e os pares de letra
 * `editorial` e `sereno` foram acrescentados ao tema para ficarem IGUAIS ao
 * desenho, e não parecidos.
 *
 * O conteúdo de demonstração é o que veio nos desenhos, e vale a pena mantê-lo
 * assim: foi escrito como quem fala, não como quem preenche um modelo. "Trato
 * de três pessoas por manhã. Não trato de mais para poder trabalhar assim." é
 * uma frase que vende; "excelência no atendimento" não é.
 */

// ---------------------------------------------------------------------------
// Alimentação — Forno & Brasa
//
// A ideia do desenho: a comida ocupa o ecrã inteiro e o texto vive por cima da
// fotografia, nunca numa caixa branca por baixo. O horário é a segunda coisa
// que se lê, porque "às 6h30 já há pão" é o argumento de venda.
// ---------------------------------------------------------------------------

const sementeForno: DemoSeed = {
  nome: 'Forno & Brasa',
  tagline: 'Às 6h30 já há pão de massa lêveda a sair do forno de lenha. Ao almoço, dois pratos do dia.',
  sobre: [
    'O meu avô acendia-o às quatro da manhã com lenha de eucalipto. Agora sou eu que o acendo, e a minha filha faz os bolos de arroz.',
    'É o mesmo forno desde 1978. Nunca o mudámos porque nunca houve razão.',
  ],
  itensTitulo: 'Preços de hoje · balcão',
  itens: [
    { title: 'Pão de massa lêveda', text: 'Cozido em forno de lenha. 2,40 € o quilo.' },
    { title: 'Bolo de arroz', text: 'Feito de manhã, todos os dias. 1,10 €.' },
    { title: 'Pastel de nata', text: 'Massa folhada nossa, creme feito aqui. 1,30 €.' },
    { title: 'Prato do dia', text: 'Com sopa, pão e café. 9,50 € ao almoço.' },
  ],
  diferenciais: [
    { title: 'Aberto às 6h30', text: 'Quando abrimos já há pão quente. Fechamos às 20h, todos os dias.' },
    { title: 'Forno de lenha', text: 'O mesmo desde 1978. A massa leveda de um dia para o outro.' },
    { title: 'Bolos por encomenda', text: 'De aniversário ou para a festa, com dois dias de aviso.' },
  ],
  faq: [
    { question: 'A que horas sai o pão?', answer: 'A primeira fornada está pronta às 6h30. Sai outra a meio da tarde.' },
    { question: 'Fazem bolos de aniversário?', answer: 'Fazemos, com dois dias de aviso. Diga-nos o sabor e quantas pessoas.' },
    { question: 'Há pratos do dia todos os dias?', answer: 'Dois, ao almoço, de segunda a sábado. Inclui sopa, pão e café.' },
  ],
  ctaHeadline: 'Encomende o bolo por WhatsApp.',
};

const SECCOES_FORNO = [
  'hero',
  'produtos',
  'sobre',
  'cardapio',
  'reputacao',
  'localizacao',
  'cta',
] as const;

export const alimentacaoDesenhado: SiteTemplate = {
  id: 'alimentacao-forno',
  name: 'Alimentação · Forno',
  style: 'premium',
  category: 'padaria',
  description: 'Creme e brasa, serifa de revista nos títulos, preços à vista e o horário em destaque.',
  suits:
    'padarias, restaurantes, hamburguerias e casas de comida com história. Serve sobretudo quando ' +
    'há uma fotografia boa do produto: o desenho é feito para ela ocupar o ecrã inteiro.',
  tags: ['comida', 'desenhado', 'preços à vista'],
  palette: 'forno',
  font: 'editorial',
  sections: [...SECCOES_FORNO],
  demo: buildDemo(sementeForno, SECCOES_FORNO, 'padaria'),
  active: true,
};

// ---------------------------------------------------------------------------
// Saúde e estética — Clínica Vale
//
// A ideia do desenho: o espaço vazio e a luz. Os blocos de texto ocupam sete
// colunas encostadas à esquerda e as cinco restantes ficam vazias — a
// assimetria é o desenho. O verde aparece três vezes em toda a página.
//
// A reputação vem LOGO A SEGUIR à abertura, antes do "sobre": numa clínica, os
// números (dez anos, 156 avaliações, 4,9) são o que tira o medo de marcar.
// ---------------------------------------------------------------------------

const sementeClinica: DemoSeed = {
  nome: 'Clínica Vale',
  tagline:
    'Medicina dentária e estética facial na Avenida da República, em Braga. Três cadeiras, um médico, primeira avaliação gratuita.',
  sobre: [
    'Trato de três pessoas por manhã. Não trato de mais para poder trabalhar assim.',
    'Mestrado Integrado em Medicina Dentária pela Universidade do Porto. Pós-graduação em Implantologia Oral em Barcelona, e certificação Invisalign desde 2020 — 340 casos tratados.',
  ],
  itensTitulo: 'Tratamentos e preços',
  itens: [
    { title: 'Consulta de avaliação', text: 'Gratuita. Saímos de lá com o plano e o preço no papel.' },
    { title: 'Limpeza e destartarização', text: '55 €, numa sessão de 40 minutos.' },
    { title: 'Implante unitário com coroa', text: 'Desde 890 €. Cirurgia de 45 minutos, coroa três meses depois.' },
    { title: 'Ortodontia invisível', text: 'Desde 2 400 €, tratamento completo de 9 a 14 meses.' },
  ],
  diferenciais: [
    { title: 'Um médico só', text: 'Quem faz a avaliação é quem faz o tratamento, do princípio ao fim.' },
    { title: 'Preço no papel', text: 'O plano sai da primeira consulta com o valor escrito. Nunca aparece um extra.' },
    { title: 'Prestações sem juros', text: 'Acima de 500 € dividimos até 12 meses. Aceitamos cheque-dentista.' },
  ],
  faq: [
    {
      question: 'Dói?',
      answer:
        'Um implante é feito com anestesia local e não se sente. O desconforto aparece nos dois dias seguintes e resolve-se com ibuprofeno.',
    },
    {
      question: 'Quanto tempo demora?',
      answer:
        'Branqueamento: uma sessão de 75 minutos. Implante: cirurgia de 45 minutos e coroa três meses depois. Ortodontia invisível: 9 a 14 meses.',
    },
    {
      question: 'Posso pagar a prestações?',
      answer:
        'Sim. Acima de 500 € dividimos até 12 mensalidades sem juros. Um implante fica em 74 € por mês.',
    },
  ],
  ctaHeadline: 'Diga-me só o que lhe dói e quando pode vir.',
};

const SECCOES_CLINICA = [
  'hero',
  'reputacao',
  'sobre',
  'servicos',
  'faq',
  'localizacao',
  'cta',
] as const;

export const saudeDesenhado: SiteTemplate = {
  id: 'saude-clinica',
  name: 'Saúde · Clínica',
  style: 'minimal',
  category: 'clinica-dentaria',
  description: 'Muito branco, serifa fina e um verde sóbrio usado três vezes. Preços e perguntas incómodas respondidas.',
  suits:
    'clínicas dentárias, médicos especialistas, cirurgia plástica, implante capilar e clínicas de ' +
    'estética. Serve quando há um médico com nome para pôr à frente — é isso que uma cadeia nunca copia.',
  tags: ['saúde', 'desenhado', 'sereno'],
  palette: 'clinica',
  font: 'sereno',
  sections: [...SECCOES_CLINICA],
  demo: buildDemo(sementeClinica, SECCOES_CLINICA, 'clinica'),
  active: true,
};
