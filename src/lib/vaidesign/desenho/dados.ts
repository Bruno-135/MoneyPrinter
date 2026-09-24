/**
 * O conteúdo das páginas da VaiDesign.
 *
 * O Claude Design guarda os dados de cada página num `<script>` de lógica ao
 * lado da marcação. Aqui estão os mesmos dados, palavra por palavra, passados
 * a TypeScript — o motor enche os moldes com isto.
 *
 * Os textos não são meus: são os do desenho. Se um dia houver de mudar um
 * preço ou um serviço, muda-se aqui e o artboard não se toca.
 */

export interface Modelo {
  id: string;
  nome: string;
  ramo: string;
  img: string;
  alt: string;
}

const MODELOS: readonly [string, string, string][] = [
  ['forno', 'Forno & Brasa', 'Padarias e restaurantes'],
  ['clinica', 'Clínica Vale', 'Clínicas e estética'],
  ['predial', 'Predial', 'Imobiliárias e advogados'],
  ['retrato', 'Retrato', 'Quem trabalha sozinho'],
  ['oficina', 'Oficina', 'Fábricas e empresas B2B'],
  ['estrada', 'Estrada', 'Transportes e entregas'],
  ['neon', 'Neon', 'Lojas de roupa e catálogos'],
];

export const modelos: Modelo[] = MODELOS.map(([id, nome, ramo]) => ({
  id,
  nome,
  ramo,
  // No desenho isto era `assets/modelos/<id>.jpeg`. Aqui as fotografias vivem
  // em `public/`, servidas pela raiz.
  img: `/vaidesign/modelos/${id}.jpeg`,
  alt: `Captura da abertura do modelo ${nome}`,
}));

/** O ramo de cada modelo, para os filtros da página Modelos. */
export const RAMOS = [
  'Todos',
  'Restauração',
  'Saúde e estética',
  'Serviços profissionais',
  'Indústria e logística',
  'Comércio',
] as const;

export const RAMO_DO_MODELO: Record<string, string> = {
  forno: 'Restauração',
  clinica: 'Saúde e estética',
  predial: 'Serviços profissionais',
  retrato: 'Serviços profissionais',
  oficina: 'Indústria e logística',
  estrada: 'Indústria e logística',
  neon: 'Comércio',
};

/** Nome, ramo e etiquetas de cada modelo, como a ficha os mostra. */
export const FICHA_DO_MODELO: Record<string, { nome: string; ramo: string; tags: string[] }> = {
  forno: {
    nome: 'Forno & Brasa',
    ramo: 'Padarias e restaurantes',
    tags: ['menu com preços', 'WhatsApp', 'escuro'],
  },
  clinica: {
    nome: 'Clínica Vale',
    ramo: 'Clínicas e estética',
    tags: ['marcações', 'equipa', 'claro'],
  },
  predial: {
    nome: 'Predial',
    ramo: 'Imobiliárias e advogados',
    tags: ['pesquisa', 'fichas de imóvel', 'sóbrio'],
  },
  retrato: {
    nome: 'Retrato',
    ramo: 'Quem trabalha sozinho',
    tags: ['uma página', 'testemunhos', 'foto grande'],
  },
  oficina: {
    nome: 'Oficina',
    ramo: 'Fábricas e empresas B2B',
    tags: ['ficha técnica', 'orçamento', 'industrial'],
  },
  estrada: {
    nome: 'Estrada',
    ramo: 'Transportes e entregas',
    tags: ['zonas servidas', 'WhatsApp', 'azul forte'],
  },
  neon: {
    nome: 'Neon',
    ramo: 'Lojas de roupa e catálogos',
    tags: ['preços à vista', 'tamanhos', 'escuro'],
  },
};

/**
 * Os nove serviços, como aparecem na página de início.
 *
 * `t` título, `d` descrição longa, `c` a curta do telemóvel, `f`/`fm` a
 * descrição da fotografia, `cls`/`clsm` a classe de entrada em cena.
 */
const SERVICOS_INICIO: readonly [string, string, string, string, string][] = [
  [
    'Site de negócio',
    'O site que um comércio precisa: quem é, o que faz, onde está e como se fala com ele.',
    'Quem é, o que faz, onde está.',
    '3:2 — montra de um comércio de bairro vista da rua, porta aberta, letreiro legível. Luz de fim de tarde, sem pessoas a posar.',
    '3:2 — montra de bairro vista da rua, fim de tarde.',
  ],
  [
    'Página pessoal',
    'Para quem trabalha sozinho e é o produto: advogados, nutricionistas, personal trainers.',
    'Para quem é o próprio produto.',
    '3:2 — profissional no seu espaço, a meio de uma tarefa, olhar fora da câmara. Luz de janela, fundo arrumado mas real.',
    '3:2 — profissional a trabalhar no seu espaço.',
  ],
  [
    'Loja online',
    'Catálogo com fotografias, preços e tamanhos, e a encomenda a fechar-se por WhatsApp.',
    'Catálogo e encomenda por WhatsApp.',
    '3:2 — roupa dobrada numa bancada de madeira, etiqueta de preço à vista, telemóvel ao lado. Luz natural lateral.',
    '3:2 — roupa dobrada, etiqueta e telemóvel.',
  ],
  [
    'Logótipo e identidade',
    'O nome, as cores e a letra, prontos para o site, o Instagram e a montra.',
    'Nome, cores e letra, prontos.',
    '3:2 — provas de cor, papel e um cartão com logótipo, vistos de cima. Luz difusa, sombras curtas.',
    '3:2 — provas de cor e papel, de cima.',
  ],
  [
    'Página de vendas',
    'Uma página só, feita para uma coisa: que a pessoa carregue no botão.',
    'Uma página, um botão.',
    '3:2 — mão a segurar um telemóvel com uma página e um botão em destaque. Fundo desfocado, luz de interior quente.',
    '3:2 — mão com telemóvel, botão à vista.',
  ],
  [
    'SEO local',
    'Aparecer no Google quando alguém procura o que vende, na zona onde está.',
    'Aparecer no Google, na sua zona.',
    '3:2 — telemóvel com um mapa aberto numa rua reconhecível, pousado no balcão de uma loja. Luz natural.',
    '3:2 — telemóvel com mapa, no balcão.',
  ],
  [
    'Gestão de redes sociais',
    'Cuidamos do Instagram e do Facebook por si: calendário do mês, publicações e respostas às mensagens.',
    'Instagram e Facebook, todos os meses.',
    '3:2 — telemóvel com o Instagram de um comércio aberto, grelha de publicações à vista, pousado numa mesa de café. Luz natural.',
    '3:2 — telemóvel com um Instagram de loja.',
  ],
  [
    'Criação de conteúdos',
    'Publicações feitas para o seu negócio, não modelos genéricos: fotografia, texto e vídeo curto com a sua cara.',
    'Posts e vídeos com a sua cara.',
    '3:2 — bastidores: telemóvel num tripé a filmar um produto num balcão, dono ao lado a preparar. Luz de janela.',
    '3:2 — telemóvel num tripé a filmar o balcão.',
  ],
  [
    'Anúncios pagos',
    'Campanhas no Instagram, Facebook, Google, YouTube, TikTok e LinkedIn, com orçamento definido por si.',
    'Meta, Google, TikTok e LinkedIn.',
    '3:2 — portátil com a pré-visualização de um anúncio, caderno com o orçamento escrito à mão ao lado. Luz lateral suave.',
    '3:2 — portátil com um anúncio, caderno ao lado.',
  ],
];

export const servicosDoInicio = SERVICOS_INICIO.map(([t, d, c, f, fm], i) => ({
  t,
  d,
  c,
  f,
  fm,
  id: `svc-${i + 1}`,
  idm: `svc-m-${i + 1}`,
  cls: `vd-entra vd-i${i % 3}`,
  clsm: `vd-entra vd-i${i % 2}`,
}));

/** A fita que corre na abertura: quatro entradas e as quatro cópias. */
export const fita = Array.from({ length: 8 }, (_, i) => ({ dup: i >= 4 ? 'true' : 'false' }));

export const garantias = [
  { i: 'key', t: 'Domínio em seu nome', d: 'O endereço do site é registado para si.' },
  { i: 'contract', t: 'Proposta por escrito', d: 'Preço e prazo fechados antes de começar.' },
  { i: 'lock_open', t: 'Sem fidelização', d: 'O site é seu. Leva-o para onde quiser.' },
  { i: 'schedule', t: 'Resposta no próprio dia', d: 'Em dias úteis, a qualquer mensagem.' },
];

/** Os nove serviços da página de Serviços, com o que entra e o que não entra. */
export const servicos = [
  {
    id: 'svc-1',
    n: '01',
    t: 'Site de negócio',
    f: 'montra de um comércio de bairro',
    d: 'O site que um comércio precisa: quem é, o que faz, onde está e como se fala com ele.',
    inc: ['Até cinco páginas', 'Mapa, morada e horário', 'Botões de WhatsApp e de chamada', 'Formulário de contacto'],
    exc: ['Pagamentos no site', 'Blogue com artigos longos', 'Sessão fotográfica'],
  },
  {
    id: 'svc-2',
    n: '02',
    t: 'Página pessoal',
    f: 'profissional no seu espaço',
    d: 'Para quem trabalha sozinho e é o produto: advogados, nutricionistas, personal trainers.',
    inc: [
      'Uma página longa, por secções',
      'Fotografia de apresentação em destaque',
      'Testemunhos e perguntas frequentes',
      'Ligação à sua agenda de marcações',
    ],
    exc: ['Sistema de marcações próprio', 'Área reservada para clientes'],
  },
  {
    id: 'svc-3',
    n: '03',
    t: 'Loja online',
    f: 'roupa dobrada numa bancada, luz de janela',
    d: 'Catálogo com fotografias, preços e tamanhos, e a encomenda a fechar-se por WhatsApp.',
    inc: [
      'Catálogo até 50 produtos',
      'Fotografia, preço e tamanhos por produto',
      'Categorias e filtros',
      'Encomenda enviada por WhatsApp',
    ],
    exc: ['Pagamento com cartão no site', 'Gestão de stock', 'Faturação'],
  },
  {
    id: 'svc-4',
    n: '04',
    t: 'Logótipo e identidade',
    f: 'provas de cor e papel sobre a mesa',
    d: 'O nome, as cores e a letra, prontos para o site, o Instagram e a montra.',
    inc: [
      'Logótipo em três versões',
      'Paleta de cores e letra',
      'Imagem de perfil e capas para Instagram',
      'Ficheiros prontos para montra e impressão',
    ],
    exc: ['Impressão e montagem', 'Registo da marca'],
  },
  {
    id: 'svc-5',
    n: '05',
    t: 'Página de vendas',
    f: 'telemóvel na mão, botão em destaque',
    d: 'Uma página só, feita para uma coisa: que a pessoa carregue no botão.',
    inc: [
      'Uma página com um único objetivo',
      'Texto escrito connosco',
      'Botão repetido nos pontos certos',
      'Versão pronta para anúncios',
    ],
    exc: ['Gestão de campanhas pagas', 'Várias ofertas na mesma página'],
  },
  {
    id: 'svc-6',
    n: '06',
    t: 'SEO local',
    f: 'mapa no telemóvel, rua reconhecível',
    d: 'Aparecer no Google quando alguém procura o que vende, na zona onde está.',
    inc: [
      'Perfil da empresa no Google configurado',
      'Título e descrição de cada página',
      'Nome, morada e telefone coerentes em todo o lado',
      'Relatório do ponto de partida',
    ],
    exc: ['Promessa de primeiro lugar', 'Publicidade paga no Google'],
  },
  {
    id: 'svc-7',
    n: '07',
    t: 'Gestão de redes sociais',
    f: 'telemóvel com o Instagram de um comércio aberto, numa mesa de café',
    d: 'Cuidamos do Instagram e do Facebook por si: calendário do mês, publicações e respostas às mensagens.',
    inc: [
      'Calendário mensal aprovado consigo',
      'Publicações e histórias agendadas',
      'Resposta a comentários e mensagens em dias úteis',
      'Resumo mensal do que funcionou',
    ],
    exc: ['Orçamento de anúncios', 'Atendimento ao fim de semana'],
  },
  {
    id: 'svc-8',
    n: '08',
    t: 'Criação de conteúdos',
    f: 'telemóvel num tripé a filmar um produto num balcão',
    d: 'Publicações feitas para o seu negócio, não modelos genéricos: fotografia, texto e vídeo curto com a sua cara.',
    inc: [
      'Posts de imagem e carrossel',
      'Vídeos curtos para Reels e TikTok',
      'Textos e legendas escritos consigo',
      'Capas e destaques no estilo da marca',
    ],
    exc: ['Produção de vídeo com equipa', 'Contratação de modelos ou atores'],
  },
  {
    id: 'svc-9',
    n: '09',
    t: 'Anúncios pagos',
    f: 'portátil com a pré-visualização de um anúncio, caderno com o orçamento',
    d: 'Campanhas no Instagram, Facebook, Google, YouTube, TikTok e LinkedIn, com orçamento definido por si.',
    inc: [
      'Criação das campanhas e dos anúncios',
      'Público e zona definidos consigo',
      'Acompanhamento e ajustes semanais',
      'Relatório mensal em linguagem simples',
    ],
    exc: ['O valor pago às plataformas', 'Promessa de vendas'],
  },
];

/** Os quatro passos da página Sobre. */
export const passos = [
  {
    n: '01',
    t: 'Conversa',
    d: 'Manda uma mensagem com o que vende e o modelo de que gostou — ou o que precisa, se quiser um site feito à medida. Fazemos as perguntas que faltam.',
    q: '15 minutos',
  },
  {
    n: '02',
    t: 'Proposta',
    d: 'Recebe por escrito o que fica incluído, o preço e a data de entrega. Não paga nada para a ver.',
    q: 'No próprio dia',
  },
  {
    n: '03',
    t: 'Montagem',
    d: 'Adaptamos o modelo com os seus textos, cores e fotografias. Vê uma versão antes de ir ao ar.',
    q: '48 horas',
  },
  {
    n: '04',
    t: 'No ar',
    d: 'O site fica publicado no seu domínio, em seu nome. Explicamos como pedir alterações daqui para a frente.',
    q: 'E depois',
  },
];

/**
 * O estado do formulário de contacto, como o desenho o pede.
 *
 * O Claude Design desenhou três ecrãs — vazio, com erro e enviado — e
 * pergunta por eles com estes nomes. Quem decide qual deles se mostra é o
 * servidor, depois de receber o formulário.
 */
export interface EstadoDoFormulario {
  /** Mostrar o formulário. Falso depois de enviado. */
  form: boolean;
  /** O campo do contacto sem erro. */
  ok2: boolean;
  /** O campo do contacto com erro. */
  erro: boolean;
  /** O painel do «Recebido». */
  enviado: boolean;
  /** O que a pessoa já tinha escrito, para não se perder num erro. */
  v1: string;
  v3: string;
  v4: string;
  v5: string;
}

export const FORMULARIO_VAZIO: EstadoDoFormulario = {
  form: true,
  ok2: true,
  erro: false,
  enviado: false,
  v1: '',
  v3: '',
  v4: 'Sem preferência',
  v5: '',
};

export const FORMULARIO_ENVIADO: EstadoDoFormulario = {
  form: false,
  ok2: false,
  erro: false,
  enviado: true,
  v1: '',
  v3: '',
  v4: '',
  v5: '',
};

/** Os modelos que se podem escolher no formulário, na ordem do desenho. */
export const ESCOLHAS_DE_MODELO = [
  'Sem preferência',
  'Forno & Brasa',
  'Clínica Vale',
  'Predial',
  'Retrato',
  'Oficina',
  'Estrada',
  'Neon',
] as const;

/**
 * A mensagem de exemplo que o desenho põe ao lado do formulário.
 *
 * É a melhor ideia da página e não é minha: quem vende a um padeiro sabe que
 * o que trava não é o formulário, é ficar a olhar para uma caixa vazia sem
 * saber o que escrever. Dar um texto para copiar e mudar tira isso do
 * caminho. Está aqui porque o botão «Copiar exemplo» precisa dela no browser.
 */
export const MENSAGEM_DE_EXEMPLO =
  'Olá! Chamo-me Rita e tenho uma padaria em Setúbal, a Pão da Rita. ' +
  'Vendemos pão, bolos e fazemos encomendas para festas. ' +
  'Gostei do modelo Forno & Brasa. Já tenho logótipo, não tenho domínio. ' +
  'Tenho algumas fotografias do balcão. Queria o site antes do Natal.';

/** O que trazer na primeira mensagem, na página de Contacto. */
export const lista = [
  { n: '1', t: 'O nome do negócio e onde fica', d: 'Rua ou zona chega. Ajuda a pensar no SEO local.' },
  { n: '2', t: 'O que vende, em duas frases', d: 'Como explicaria a um cliente novo ao balcão.' },
  {
    n: '3',
    t: 'O modelo de que mais gostou',
    d: 'Ou dois, se estiver indeciso. Se nenhum servir, descreva o que precisa: fazemos um à sua medida.',
  },
  {
    n: '4',
    t: 'O que já tem',
    d: 'Logótipo, domínio, fotografias, textos. Se não tiver nada, diga — também serve.',
  },
  { n: '5', t: 'Para quando precisa', d: 'Uma data, se houver: abertura, época alta, campanha.' },
];
