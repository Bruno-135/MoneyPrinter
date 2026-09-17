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
  sobreTitulo: 'O forno é o mesmo desde 1978',
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
  imagem: 'loja',
  desenho: `Escala tipográfica:
- Display: 88px / entrelinha 0.90 / espaçamento entre letras −0.04em
- Título: 36px / 1.10 / −0.025em
- Texto: 17px / 1.58 / 0, com a linha a 62 caracteres
- Legenda: 12px, MAIÚSCULAS, espaçamento 0.12em
- Números (preços, horas, avaliações): tipo tabular, para a vírgula alinhar
  em coluna

Grelha:
- Computador: 12 colunas, goteira 24, margem 96. Blocos de 5, 6 e 7 colunas.
- Telemóvel: 4 colunas, margem 20.

Espaçamento, base 8: 8 dentro de um par · 24 entre linhas de uma lista ·
40 entre um bloco e a sua legenda · 72 dentro da secção · 128 antes de uma
secção importante. GENEROSO e DESIGUAL.

Fotografia: duas proporções só — 16:9 na abertura, 3:2 no corpo (4:5 no
telemóvel). Ponta a ponta, sem cantos redondos nem sombra.

A ideia do desenho: a comida ocupa o ecrã inteiro. A abertura é a fotografia a
toda a largura e altura, com o nome por cima em letra enorme e o texto POR CIMA
da imagem — nunca numa caixa branca por baixo. O horário é a segunda coisa que
se lê, porque "às 6h30 já há pão" é o argumento de venda. Os preços estão à
vista. As avaliações aparecem como um número enorme, não como estrelinhas.

O que NÃO fazer neste ramo: fundo de madeira, quadro de giz, trigo desenhado,
"tradição desde", bandeirinhas italianas, chapéu de cozinheiro.

Movimento: uma entrada suave de 620ms e mais nada.`,
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
  sobreTitulo: 'Quem trata',
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
  // Neutro escuro, como o marcador de fotografia do desenho. A família
  // 'clinica' é azul e lutava com o verde do acento.
  imagem: 'neutro',
  desenho: `Escala tipográfica:
- Display: 88px / entrelinha 1.0 / espaçamento −0.035em (62px no telemóvel)
- Título: 34px / 1.08 / −0.02em
- Texto: 17px / 1.6, com a linha fixada em 62 caracteres
- Números grandes (nota, contagens, anos): 112px / 0.88, tipo tabular
- Legenda: 12px, MAIÚSCULAS, espaçamento 0.14em

Grelha:
- Computador: 12 colunas, goteira 24, margem 96 a 120. Os blocos de texto
  ocupam 7 COLUNAS ENCOSTADAS À ESQUERDA e as 5 restantes ficam VAZIAS. A
  assimetria é o desenho — não centres nada.
- Telemóvel: 4 colunas, goteira 16, margem 24.

Espaçamento, base 8: 8 · 16 · 24 · 32 · 48 · 72 · 120 · 176.

A ideia do desenho: o espaço vazio e a luz. Muito ar, poucas palavras,
tipografia grande e serena — quem abre tem de sentir que entrou num sítio calmo
e caro. A abertura é a fotografia do espaço VAZIO e bem iluminado, não uma
pessoa a sorrir.

Os números são a prova e vêm cedo: anos de exercício, número de avaliações e a
média, em três blocos com os algarismos enormes. Numa clínica, é isso que tira
o medo de marcar.

Os preços aparecem como um menu de restaurante caro: nome à esquerda, filete a
pontilhado, valor à direita. As perguntas frequentes são as incómodas — dói,
quanto tempo demora, posso pagar a prestações — com respostas concretas.

O que NÃO fazer neste ramo: azul-clínico com branco, o símbolo do dente, o
sorriso de banco de imagens, a cruz médica, "cuidamos do seu sorriso". Em
estética: cor-de-rosa, dourado, flores, mármore falso.`,
  sections: [...SECCOES_CLINICA],
  demo: buildDemo(sementeClinica, SECCOES_CLINICA, 'clinica'),
  active: true,
};
