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

// ---------------------------------------------------------------------------
// Imobiliário — Pereira & Costa
//
// A ideia do desenho: a rua. Não o logótipo, não a equipa a sorrir de braços
// cruzados — a RUA, com o azulejo e as varandas, e três imóveis com preço à
// vista logo a seguir aos números.
//
// A licença AMI está no cabeçalho, ao lado do nome, e não escondida no rodapé:
// num ramo onde toda a gente desconfia, a credencial é o primeiro argumento.
// Pela mesma razão os números vêm antes de tudo o resto — "60 imóveis, 41 dias
// até à escritura" diz mais do que qualquer adjectivo.
//
// A oferta tem PRAZO ("marcações até 31 de Outubro"). Uma avaliação gratuita
// sem data é um convite para adiar.
// ---------------------------------------------------------------------------

const sementeImobiliaria: DemoSeed = {
  nome: 'Pereira & Costa',
  tagline:
    'Três consultores, um escritório na Rua de Santa Catarina. Vendemos 60 imóveis nos últimos doze meses — 41 dias de média até à escritura.',
  sobre: [
    'Conhecemos estas ruas casa a casa, há doze anos. Bonfim, Marquês e Campanhã — não trabalhamos fora daqui de propósito.',
    'A Helena cresceu na Rua do Heroísmo. Quando ela diz quanto vale um terceiro andar sem elevador na Rua de São Victor, sabe do que fala.',
  ],
  sobreTitulo: 'Conhecemos estas ruas casa a casa',
  itensTitulo: 'À venda agora',
  itens: [
    {
      title: 'T2 renovado, Bonfim',
      text: '78 m² · 3.º andar · Rua de São Victor',
      preco: '235 000 €',
    },
    {
      title: 'T3 com varanda, Marquês',
      text: '112 m² · 2.º andar · Rua Álvares Cabral',
      preco: '310 000 €',
    },
    {
      title: 'T1 + escritório, Bonfim',
      text: '54 m² · r/c · Rua do Barão de São Cosme',
      preco: '168 000 €',
    },
  ],
  diferenciais: [
    {
      title: 'Helena Pereira',
      text: 'Sócia. Cresceu na Rua do Heroísmo, trata do Bonfim há doze anos.',
    },
    {
      title: 'Rui Costa',
      text: 'Sócio. Marquês e Constituição. Faz as avaliações e negocia com a banca.',
    },
    {
      title: 'Sofia Antunes',
      text: 'Consultora. Arrendamento e primeira compra. Fala inglês e francês.',
    },
  ],
  ctaHeadline: 'Quanto vale a sua casa no Bonfim?',
};

// A oferta fica no fim, depois da morada. No desenho a avaliação gratuita vem
// antes do rodapé, mas aqui `localizacao` é um cartão com a morada e não o
// rodapé — esse é escrito pela aplicação a seguir, em qualquer página. Manda a
// regra da biblioteca: uma página acaba numa acção, nunca num endereço.
const SECCOES_IMOBILIARIA = [
  'hero',
  'reputacao',
  'produtos',
  'diferenciais',
  'localizacao',
  'cta',
] as const;

export const imobiliariaDesenhado: SiteTemplate = {
  id: 'imobiliaria-predial',
  name: 'Imobiliário · Predial',
  style: 'premium',
  category: 'imobiliaria',
  description:
    'Papel quente e tijolo do Porto, serifa de jornal, imóveis com preço à vista e a licença ao lado do nome.',
  suits:
    'imobiliárias, mediadores, avaliadores e afins — e serve também advogados e contabilistas, ' +
    'que vendem a mesma coisa: confiança provada por números. Feito para quem trabalha UMA zona ' +
    'e quer dizê-lo.',
  tags: ['imobiliário', 'desenhado', 'preços à vista'],
  palette: 'predial',
  font: 'registo',
  // A família `escritorio` é azul-acinzentada e luta com o tijolo. `loja` é
  // neutro quente e é a que fica em paz com esta paleta.
  imagem: 'loja',
  desenho: `Escala tipográfica:
- Display: 44px no telemóvel, 76px no computador / entrelinha 1.02 /
  espaçamento entre letras −0.03em / peso 500, nunca bold
- Título de secção: 30px / 1.12 / −0.02em
- Texto: 17px / 1.55 / 0, com a linha a 33 caracteres no telemóvel
- Sobretítulo e legenda: 11px, MAIÚSCULAS, espaçamento 0.14em
- Preços e metragens: tipo tabular, para os algarismos alinharem em coluna

Grelha:
- Computador: 12 colunas, goteira 24, margem 64. Os imóveis em 3 colunas.
- Telemóvel: margem 20, imóveis empilhados.

Espaçamento, base 8: 8 dentro de um par · 14 entre a foto e a legenda ·
28 no topo de um bloco · 56 entre secções · 96 antes da oferta.

Linhas: 1px sólido na cor do texto (#14110E), não cinzento. As secções
separam-se por régua a toda a largura, com borda em cima E em baixo na faixa
dos números. É o desenho de um documento, não de um cartão.

Fotografia: 3:2 na abertura, 4:5 em cada imóvel. Ponta a ponta, sem cantos
redondos nem sombra. A foto de abertura é a RUA — fachadas, azulejo,
varandas — e nunca uma sala de reuniões nem um aperto de mão.

A ideia do desenho: prova antes de promessa. A licença AMI fica no cabeçalho
ao lado do nome, não no rodapé. Os números (anos na zona, imóveis vendidos,
avaliações) vêm logo a seguir à abertura, em três colunas com régua. Os
imóveis têm preço à vista, em euros e por extenso — um imóvel sem preço não é
um imóvel, é uma fotografia. A equipa aparece com o que cada um faz e uma
frase que prova que conhece a zona, não com cargos.

A oferta tem PRAZO e é concreta: "avaliação gratuita, marcações até 31 de
Outubro, visita em 48 horas, relatório escrito com valores de venda reais da
rua, sem compromisso". Uma avaliação gratuita sem data é um convite a adiar.

O que NÃO fazer neste ramo: aperto de mão, chaves ao alto, casinha desenhada,
gráfico a subir, "o seu sonho começa aqui", "excelência e confiança", fotos de
prédios de vidro que não são da zona, mapa decorativo sem morada.

Movimento: uma subida de 14px com 500ms à entrada, e mais nada.`,
  sections: [...SECCOES_IMOBILIARIA],
  demo: buildDemo(sementeImobiliaria, SECCOES_IMOBILIARIA, 'loja'),
  active: true,
};

// ---------------------------------------------------------------------------
// Pessoal — Helena Braga
//
// A ideia do desenho: uma pessoa, não uma firma. O retrato é a primeira coisa
// e olha para fora do ecrã. Não há "nós" em lado nenhum — é sempre "eu".
//
// Duas coisas que quase nenhuma página de profissional faz, e que são as que
// mais vendem aqui: diz o que NÃO faz ("não faço penal, não faço laboral") e
// põe os PREÇOS em tabela, incluindo o zero da primeira conversa. As duas
// dizem a mesma coisa — que não há surpresa à espera — e é isso que faz uma
// pessoa mandar a mensagem.
// ---------------------------------------------------------------------------

const sementePessoal: DemoSeed = {
  nome: 'Helena Braga',
  tagline:
    'Trabalho sobretudo com famílias em processos de divórcio. Na primeira meia hora digo-lhe se tem caso. Isso não lhe custa nada.',
  sobre: [
    'Sou Helena Braga. Exerço há dezasseis anos e há onze que atendo nesta sala da Rua do Carmo.',
    'Desde 2010 acompanhei mais de 300 divórcios e regulações parentais. Trabalho sozinha: quem lhe responde à mensagem sou eu, e quem vai ao tribunal também.',
  ],
  sobreTitulo: 'Quem sou',
  itensTitulo: 'Três coisas que faço',
  itens: [
    {
      title: 'Divórcio e responsabilidades parentais',
      text: 'Mútuo consentimento ou litigioso, guarda, pensão de alimentos, alteração de acordos já feitos. Mútuo consentimento, 450 €.',
    },
    {
      title: 'Arrendamento',
      text: 'Rendas em atraso, despejos, denúncia do contrato, obras que o senhorio não faz. Consulta por vídeo, 60 € a hora.',
    },
    {
      title: 'O resto do direito da família',
      text: 'Uniões de facto, partilhas, inventários, alimentos entre ex-cônjuges. Regulação parental, desde 700 €.',
    },
  ],
  diferenciais: [
    {
      title: 'Manda-me mensagem',
      text: 'Duas linhas bastam: o que se passa e desde quando.',
    },
    {
      title: 'Falamos meia hora',
      text: 'Por WhatsApp, por vídeo ou aqui no escritório. À hora que lhe der. Não custa nada.',
    },
    {
      title: 'Digo-lhe se tem caso',
      text: 'E quanto custa, por escrito. Se não tiver caso, digo-lhe isso também.',
    },
  ],
  ctaHeadline: 'Conte-me o que se passa. Meia hora, sem custo.',
};

// A ordem vem declarada no próprio desenho, na tela de entrega.
const SECCOES_PESSOAL = [
  'hero',
  'sobre',
  'servicos',
  'diferenciais',
  'reputacao',
  'localizacao',
  'cta',
] as const;

export const pessoalDesenhado: SiteTemplate = {
  id: 'pessoal-retrato',
  name: 'Pessoal · Retrato',
  style: 'premium',
  category: 'advogados',
  description:
    'Uma pessoa e não uma firma: retrato a olhar para fora, preços em tabela e o que ela não faz dito à frente.',
  suits:
    'quem trabalha sozinho e é o produto — advogados, contabilistas, psicólogos, nutricionistas, ' +
    'personal trainers, consultores. Não serve equipas nem lojas: a página inteira está escrita ' +
    'na primeira pessoa e cai se houver mais do que uma cara.',
  tags: ['pessoal', 'desenhado', 'preços à vista'],
  palette: 'retrato',
  font: 'instrumento',
  imagem: 'escritorio',
  desenho: `Escala tipográfica:
- Display: 40px no telemóvel, 68px no computador / entrelinha 1.08 /
  espaçamento entre letras −0.02em / peso 400 — a Instrument Serif só tem um
  peso, e é de propósito: a ênfase faz-se em ITÁLICO, nunca em negrito
- Título de secção: 26px / 1.15 / −0.015em
- Texto: 16px / 1.62 / 0
- Sobretítulo e legenda: 11px, MAIÚSCULAS, espaçamento 0.14em
- Preços: tipo tabular, alinhados à direita numa coluna própria

Grelha:
- Telemóvel: 390 de largura, margem 24.
- Computador: duas colunas desiguais — o texto em 7, o retrato em 5.

Espaçamento, base 8: 6 dentro de um par · 14 entre blocos irmãos ·
32 no topo de uma secção · 64 entre secções.

Fotografia: DUAS em toda a página e mais nenhuma. O retrato 4:5, corte
apertado, de lado, a olhar para fora do ecrã — não de frente e não a sorrir
para a câmara. E uma 3:2 do sítio (a porta, a rua, a entrada). Sem cantos
redondos, sem sombra, sem moldura.

A ideia do desenho: uma pessoa, não uma firma. Escreve tudo na PRIMEIRA
PESSOA — "eu faço", "digo-lhe", "respondo no mesmo dia útil". Nunca "nós",
nunca "a nossa equipa", nunca "o cliente". O nome dela é o cabeçalho e a
profissão fica ao lado, em maiúsculas pequenas.

Duas secções obrigatórias, e são as que fazem a diferença:
1. "E o que não faço" — uma lista curta do que ela recusa, com a promessa de
   indicar um colega. Dizer que não é o que prova que o sim é a sério.
2. "O que custa" — tabela de preços com o valor à direita, incluindo o 0 € da
   primeira conversa, e a nota de que o total vai por escrito antes de
   começar.

O testemunho é UM só, longo, com nome próprio, o desfecho e o ano. Três
testemunhos curtos valem menos do que um que conta a história toda.

O que NÃO fazer neste ramo: balança da justiça, martelo de juiz, aperto de
mão, prateleira de livros de direito, fato e braços cruzados, "excelência",
"soluções jurídicas", "ao seu dispor", latim.

Movimento: uma subida de 14px com 500ms à entrada, e mais nada.`,
  sections: [...SECCOES_PESSOAL],
  demo: buildDemo(sementePessoal, SECCOES_PESSOAL, 'escritorio'),
  active: true,
};

// ---------------------------------------------------------------------------
// Institucional — Metalúrgica Sandim
//
// A ideia do desenho: capacidade, não simpatia. Quem compra corte a laser quer
// saber a espessura máxima, a dimensão da chapa e o prazo de orçamento — e
// quer isso em números, numa tabela, antes de qualquer frase sobre "parceria".
//
// A ordem do trabalho aparece em cinco passos numerados porque o cliente deste
// ramo está a comparar fornecedores, e o que ele compara é o processo: quem
// desenha, quem corta, quem solda, quem entrega e em quanto tempo.
// ---------------------------------------------------------------------------

const sementeInstitucional: DemoSeed = {
  nome: 'Metalúrgica Sandim',
  tagline:
    'Serralharia industrial em Gondomar desde 1991. Corte a laser até 25 mm, quinagem até 4000 mm, soldadura MIG/TIG certificada.',
  sobre: [
    'Trinta e quatro pessoas, 4000 m² cobertos na EN 108. Fibra de 6 kW, prensa de 175 toneladas e camião próprio até 8 m de peça.',
    'Orçamento em 48 horas úteis, com prazo de fabrico e preço fechado por peça. Se o desenho vier em papel, medimos e desenhamos nós.',
  ],
  sobreTitulo: 'A fábrica',
  itensTitulo: 'A ordem do trabalho',
  itens: [
    {
      title: '01 · Projecto',
      text: 'O seu DWG entra no nesting. Se vier em papel, medimos e desenhamos nós.',
    },
    {
      title: '02 · Corte a laser',
      text: 'Fibra 6 kW. Aço macio até 25 mm, inox até 15 mm, alumínio até 12 mm.',
    },
    {
      title: '03 · Quinagem',
      text: 'Prensa de 175 toneladas, 4000 mm de comprimento. Tolerância de ±0,5 mm.',
    },
    {
      title: '04 · Soldadura',
      text: 'MIG e TIG. Soldadores qualificados EN ISO 9606-1. Ensaio visual em todas as juntas estruturais.',
    },
    {
      title: '05 · Entrega',
      text: 'Camião próprio até 8 m de peça. Grande Porto em 24 h a partir da conclusão.',
    },
  ],
  diferenciais: [
    { title: 'Espessura máxima de corte', text: '25 mm em aço macio, 15 em inox, 12 em alumínio.' },
    { title: 'Dimensão máxima de chapa', text: '3000 × 1500 mm. Quinagem até 4000 mm, 175 toneladas.' },
    { title: 'Prazo de orçamento', text: '48 horas úteis, com prazo de fabrico e preço fechado por peça.' },
  ],
  ctaHeadline: 'Tem um desenho? Mande-o hoje.',
};

const SECCOES_INSTITUCIONAL = [
  'hero',
  'diferenciais',
  'servicos',
  'produtos',
  'reputacao',
  'localizacao',
  'cta',
] as const;

export const institucionalDesenhado: SiteTemplate = {
  id: 'institucional-oficina',
  name: 'Institucional · Oficina',
  style: 'minimal',
  category: 'construtora',
  description:
    'Capacidade em números antes de qualquer frase: espessuras, dimensões, prazos e a ordem do trabalho em cinco passos.',
  suits:
    'fábricas, serralharias, metalomecânica, carpintarias industriais, construtoras e qualquer ' +
    'empresa que venda a outras empresas. Serve quando o cliente compara fornecedores por ' +
    'capacidade e prazo, e não por simpatia.',
  tags: ['institucional', 'desenhado', 'B2B'],
  palette: 'oficina',
  font: 'oficio',
  imagem: 'oficina',
  desenho: `Escala tipográfica:
- Display: 46px no telemóvel, 80px no computador / entrelinha 1.00 /
  espaçamento entre letras −0.035em / peso 700
- Título de secção: 32px / 1.08 / −0.025em / peso 600
- Texto: 17px / 1.55
- Legenda e rótulo de tabela: 11px, MAIÚSCULAS, espaçamento 0.14em
- Números de capacidade: 34px, peso 700, tipo tabular — são o argumento

Grelha:
- Computador: 12 colunas, goteira 24, margem 96.
- Telemóvel: margem 24.

Espaçamento, base 8: 8 · 16 · 24 · 40 · 64 · 96. Dentro de um bloco 8 a 24,
antes de uma secção 96.

Zero cantos redondos. Zero sombras. Filetes de 1px na cor do texto.

Fotografia: 3:2 e 16:9, ponta a ponta. Corte PERTO e do trabalho a acontecer —
soldadura com faíscas, a cabeça de corte a fumegar, mãos do operador na chapa.
Nunca a fachada do edifício, nunca o gerente de gravata, nunca uma equipa
alinhada a sorrir.

A ideia do desenho: capacidade, não simpatia. Quem compra corte a laser quer
a espessura máxima, a dimensão da chapa e o prazo de orçamento, em números,
antes de qualquer frase sobre parceria.

Três blocos obrigatórios:
1. Tabela de CAPACIDADE, com rótulo à esquerda e número à direita: espessura
   máxima, dimensão de chapa, tonelagem, área coberta, número de
   trabalhadores, prazo de orçamento.
2. A ORDEM DO TRABALHO em passos numerados 01 a 05 — é o que o cliente compara
   entre fornecedores.
3. QUEM COMPRA AQUI: os sectores servidos, cada um com o que se lhes fabrica e
   um número real do ano passado.

O certificado (ISO, número de alvará, NIF) vai no rodapé, escrito por extenso.
Num ramo em que se assina contrato, a credencial é parte do produto.

O que NÃO fazer neste ramo: aperto de mão, engrenagens desenhadas, planeta
azul, "soluções integradas", "parceiro de confiança", "qualidade e
compromisso", foto de equipa de capacete novo a apontar para um tablet.

Movimento: nenhum. Esta página não anima.`,
  sections: [...SECCOES_INSTITUCIONAL],
  demo: buildDemo(sementeInstitucional, SECCOES_INSTITUCIONAL, 'oficina'),
  active: true,
};

// ---------------------------------------------------------------------------
// Transporte — Rota Curta
//
// A ideia do desenho: o relógio. Tudo nesta página responde à mesma pergunta —
// "ainda dá para hoje?" — e a resposta está no topo, em números: recolha até
// às 17h, Norte em 24 horas, 1200 kg por carrinha.
//
// Duas coisas que quase nenhum transportador põe no site e que são as que
// fecham o negócio: a TABELA DE ZONAS com o prazo de cada uma, e a lista do
// que NÃO se leva. A segunda poupa metade dos telefonemas.
// ---------------------------------------------------------------------------

const sementeTransporte: DemoSeed = {
  nome: 'Rota Curta',
  tagline:
    'Grande Porto no mesmo dia. Norte em 24 horas. Cargas até 1200 kg, paletes e mudanças. Recolha até às 17h, entrega hoje.',
  sobre: [
    'Sete anos, quatro carrinhas, armazém na Zona Industrial da Maia. Recolha até às 17h sai no próprio dia; depois disso sai às 07h30 da manhã seguinte.',
    'Manda a foto da carga e o código-postal de recolha. Respondemos com preço fechado, hora de recolha e a matrícula da carrinha.',
  ],
  sobreTitulo: 'Como trabalhamos',
  itensTitulo: 'Preços de referência',
  itens: [
    { title: 'Volume até 100 kg, Grande Porto', text: 'Recolha e entrega no mesmo dia.', preco: '18 €' },
    { title: 'Palete até 400 kg, Grande Porto', text: 'Mesmo dia, com fotografia da descarga.', preco: '45 €' },
    { title: 'Palete para o Norte, 24 h', text: 'Braga, Guimarães, Viana, Vila Real, Aveiro.', preco: 'desde 62 €' },
    { title: 'Mudança pequena, 3 h', text: 'Carrinha e dois homens. Hora extra a 22 €.', preco: '145 €' },
  ],
  diferenciais: [
    { title: '17h', text: 'Limite de recolha para a entrega sair no próprio dia. Depois das 17h, sai às 07h30.' },
    { title: '24h', text: 'Todo o Norte, porta a porta. Uma carrinha por dia para o Norte.' },
    { title: '1200 kg', text: 'Por carrinha, até 3,2 m de comprimento. Acima disso dizemos logo e indicamos quem faz.' },
  ],
  ctaHeadline: 'Ainda dá para hoje? Manda a foto da carga.',
};

const SECCOES_TRANSPORTE = [
  'hero',
  'diferenciais',
  'servicos',
  'produtos',
  'reputacao',
  'galeria',
  'localizacao',
  'cta',
] as const;

export const transporteDesenhado: SiteTemplate = {
  id: 'transporte-estrada',
  name: 'Transporte · Estrada',
  style: 'minimal',
  category: 'transportadora',
  description:
    'Tudo responde a "ainda dá para hoje": hora limite de recolha, tabela de zonas com prazos e preços de referência.',
  suits:
    'transportadoras, empresas de entregas, mudanças e estafetas. Serve qualquer negócio em que ' +
    'a pergunta do cliente seja QUANDO e não quanto — e em que responder com uma tabela em vez ' +
    'de um formulário seja a vantagem.',
  tags: ['transporte', 'desenhado', 'preços à vista'],
  palette: 'estrada',
  font: 'estrada',
  imagem: 'oficina',
  desenho: `Escala tipográfica (vinda da folha de sistema do desenho):
- Display: 88px no computador, 56px no telemóvel / entrelinha 0.98 no grande e
  1.02 no pequeno / espaçamento entre letras −0.04em / peso 700 a 800
- Título de secção: 36px / 1.06 / −0.03em / peso 700
- Texto: 17px / 1.55, linha de 45 a 70 caracteres
- Legenda: 12px, MAIÚSCULAS, espaçamento +0.14em, em IBM Plex Mono — a
  monoespaçada é só para legendas, números e matrículas
- Preços e pesos: tipo tabular, alinhados à DIREITA

Cor, na proporção 60/30/10: 60% papel (#F2EFE8), 30% tinta (#121110), 10%
destaque (#D93A0B). O destaque aparece TRÊS vezes em toda a página e não mais.
Há ainda um verde de sinal (#1E7A3C) num ponto de 8px, só para dizer "aberto
agora" — não é uma cor da paleta, é um semáforo.

ATENÇÃO ao laranja em texto pequeno: #D93A0B sobre #F2EFE8 mede 4,0:1, abaixo
do mínimo de 4,5. Serve para fundos de botão, números grandes e títulos; NÃO
serve para uma ligação de 14px no meio de um parágrafo.

Grelha:
- 1440: 12 colunas, goteira 24, margem ASSIMÉTRICA — 112 à esquerda, 96 à
  direita. O conteúdo ocupa 7 colunas e as 5 restantes ficam vazias.
- 390: 4 colunas, goteira 16, margem 24 à esquerda e 40 a 64 à direita.

Espaçamento, base 8: 8 · 16 · 24 · 40 · 64 · 96 · 128. Dentro de um bloco 8 a
24, antes de uma secção 96 a 128.

Zero cantos redondos, excepto os pontos de 8 a 12px. Fotografia sempre de
ponta a ponta, em 3:2, 16:9 ou 4:5.

A ideia do desenho: o relógio. Tudo responde à mesma pergunta — "ainda dá para
hoje?" — e a resposta está no topo em números: hora limite de recolha, prazo
para o Norte, peso máximo por carrinha.

Três blocos obrigatórios:
1. TABELA DE ZONAS: cada zona com o seu prazo, contado a partir da hora de
   recolha, e a regra do que acontece a quem recolhe depois da hora limite.
2. PREÇOS DE REFERÊNCIA, com o valor à direita e a nota do que fica de fora
   (IVA, escadas sem elevador).
3. O QUE NÃO LEVAMOS: peso acima do limite, refrigerados, ADR, animais vivos,
   pianos. Com a promessa de indicar quem faz. Poupa metade dos telefonemas e
   é o que faz o resto parecer verdade.

O orçamento pede UMA foto e um código-postal. Nunca um formulário com campos.

O que NÃO fazer neste ramo: camião genérico a fugir no horizonte, mapa-múndi
com linhas a ligar continentes, caixa de cartão com setas, "logística
inteligente", "a sua encomenda em boas mãos", relógio desenhado.

Movimento: uma subida de 14px à entrada, e mais nada.`,
  sections: [...SECCOES_TRANSPORTE],
  demo: buildDemo(sementeTransporte, SECCOES_TRANSPORTE, 'oficina'),
  active: true,
};
