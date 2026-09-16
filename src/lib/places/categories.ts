/**
 * Mapa dos ramos de negócio (em português) para os tipos do Google Places.
 *
 * NOTA IMPORTANTE sobre a fiabilidade deste mapa: a Google acrescenta, renomeia
 * e remove tipos com regularidade. Estes valores são o meu melhor conhecimento
 * e NÃO foram confirmados contra a documentação — o ambiente onde este código
 * foi escrito não tem acesso a `developers.google.com`.
 *
 * O sistema está desenhado para que um tipo errado não custe dinheiro nem parta
 * o varrimento:
 *
 *   - um `includedTypes` inválido faz a API devolver 400 INVALID_ARGUMENT, e a
 *     Google não fatura respostas 400;
 *   - ao receber esse erro, o varrimento passa automaticamente à pesquisa por
 *     texto usando `textQuery`, e regista o sucedido no resumo final.
 *
 * Ou seja: se algum destes tipos estiver errado, nota-se no resumo do primeiro
 * varrimento e corrige-se aqui, sem faturas nem código partido.
 */

/** As secções da caixa de escolha, pela ordem por que aparecem. */
export const GRUPOS = [
  'Dia a dia',
  'Profissionais e saúde',
  'Estética',
  'Serviços e ofícios',
  'Construção e obras',
  'Transporte',
  'Ensino',
] as const;

export type Grupo = (typeof GRUPOS)[number];

export interface CategoryDefinition {
  /** Identificador estável usado na linha de comandos e na base de dados. */
  slug: string;
  /** Nome mostrado ao utilizador. */
  label: string;
  /**
   * Secção da caixa de escolha. São quarenta e quatro ramos: numa lista corrida
   * ninguém encontra nada, e escolher o ramo errado custa dinheiro.
   */
  grupo: Grupo;
  /**
   * Tipos do Places para a pesquisa por proximidade.
   *
   * VAZIO é um valor legítimo e quer dizer "este ramo não tem tipo no Google".
   * Nutricionistas, psicólogos e harmonização facial não têm — e inventar-lhes
   * um tipo parecido é pior do que não ter nenhum: um tipo ERRADO mas VÁLIDO
   * não dá erro, devolve os comércios errados, e paga-se por eles. Com a lista
   * vazia vai-se direto à pesquisa por texto, que é o que serve para estes.
   */
  includedTypes: string[];
  /**
   * Consulta de texto, usada quando não há tipo ou quando a Google o rejeita.
   * O `{zona}` é substituído pelo nome da região.
   */
  textQuery: string;
  /**
   * O mesmo, escrito como se diz no Brasil. Só quando difere mesmo.
   *
   * "Ginásio" em Braga é "academia" em Curitiba, e um canalizador é um
   * encanador. A pesquisa por texto é literal: a palavra errada devolve meia
   * dúzia de resultados e faz parecer que não há mercado, quando o que não há
   * é a palavra.
   */
  textQueryBR?: string;
  /** Leva landing page com cardápio e pedido por WhatsApp. */
  foodService: boolean;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    slug: 'restaurante',
    label: 'Restaurante',
    grupo: 'Dia a dia',
    includedTypes: ['restaurant'],
    textQuery: 'restaurantes em {zona}',
    foodService: true,
  },
  {
    slug: 'padaria',
    label: 'Padaria',
    grupo: 'Dia a dia',
    includedTypes: ['bakery'],
    textQuery: 'padarias em {zona}',
    foodService: true,
  },
  {
    slug: 'cabeleireiro',
    label: 'Cabeleireiro',
    grupo: 'Dia a dia',
    includedTypes: ['hair_salon', 'hair_care'],
    textQuery: 'cabeleireiros em {zona}',
    foodService: false,
  },
  {
    slug: 'barbearia',
    label: 'Barbearia',
    grupo: 'Dia a dia',
    includedTypes: ['barber_shop'],
    textQuery: 'barbearias em {zona}',
    foodService: false,
  },
  {
    slug: 'salao-beleza',
    label: 'Salão de beleza',
    grupo: 'Dia a dia',
    includedTypes: ['beauty_salon'],
    textQuery: 'salões de beleza em {zona}',
    foodService: false,
  },
  {
    slug: 'ginasio',
    label: 'Ginásio',
    grupo: 'Dia a dia',
    includedTypes: ['gym', 'fitness_center'],
    textQuery: 'ginásios em {zona}',
    textQueryBR: 'academias em {zona}',
    foodService: false,
  },
  {
    // O caso mais duvidoso do mapa: não tenho a certeza de que exista um tipo
    // próprio para pilates. Se `yoga_studio` também for rejeitado, o varrimento
    // cai na pesquisa por texto, que aqui funciona bem.
    slug: 'pilates-yoga',
    label: 'Estúdio de pilates/yoga',
    grupo: 'Dia a dia',
    includedTypes: ['yoga_studio'],
    textQuery: 'estúdio de pilates ou yoga em {zona}',
    foodService: false,
  },
  {
    slug: 'oficina',
    label: 'Oficina mecânica',
    grupo: 'Dia a dia',
    includedTypes: ['car_repair'],
    textQuery: 'oficinas mecânicas em {zona}',
    foodService: false,
  },
  {
    slug: 'pet-shop',
    label: 'Pet shop',
    grupo: 'Dia a dia',
    includedTypes: ['pet_store'],
    textQuery: 'pet shops em {zona}',
    foodService: false,
  },
  {
    slug: 'clinica-dentaria',
    label: 'Clínica dentária',
    grupo: 'Dia a dia',
    includedTypes: ['dentist'],
    textQuery: 'clínicas dentárias em {zona}',
    foodService: false,
  },
  {
    slug: 'fisioterapia',
    label: 'Clínica de fisioterapia',
    grupo: 'Dia a dia',
    includedTypes: ['physiotherapist'],
    textQuery: 'clínicas de fisioterapia em {zona}',
    foodService: false,
  },
  {
    slug: 'advogados',
    label: 'Escritório de advogados',
    grupo: 'Dia a dia',
    includedTypes: ['lawyer'],
    textQuery: 'escritórios de advogados em {zona}',
    foodService: false,
  },
  {
    slug: 'contabilidade',
    label: 'Contabilidade',
    grupo: 'Dia a dia',
    includedTypes: ['accounting'],
    textQuery: 'contabilistas em {zona}',
    foodService: false,
  },
  {
    slug: 'loja-roupa',
    label: 'Loja de roupa',
    grupo: 'Dia a dia',
    includedTypes: ['clothing_store'],
    textQuery: 'lojas de roupa em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Profissionais liberais e saúde
  //
  // Gente que trabalha por conta própria, que vive da reputação e que tem
  // dinheiro. Um médico ou um advogado sem site é um prospeto melhor do que
  // uma padaria sem site: o site vale-lhe mais e o orçamento dói-lhe menos.
  // -------------------------------------------------------------------------
  {
    slug: 'imobiliaria',
    label: 'Imobiliária',
    grupo: 'Profissionais e saúde',
    includedTypes: ['real_estate_agency'],
    textQuery: 'imobiliárias em {zona}',
    foodService: false,
  },
  {
    slug: 'medico',
    label: 'Médico / consultório',
    grupo: 'Profissionais e saúde',
    includedTypes: ['doctor'],
    textQuery: 'consultórios médicos em {zona}',
    foodService: false,
  },
  {
    slug: 'clinica-estetica',
    label: 'Clínica de estética',
    grupo: 'Profissionais e saúde',
    includedTypes: ['skin_care_clinic'],
    textQuery: 'clínicas de estética em {zona}',
    foodService: false,
  },
  {
    slug: 'veterinario',
    label: 'Veterinário',
    grupo: 'Profissionais e saúde',
    includedTypes: ['veterinary_care'],
    textQuery: 'clínicas veterinárias em {zona}',
    foodService: false,
  },
  {
    slug: 'optica',
    label: 'Óptica',
    grupo: 'Profissionais e saúde',
    includedTypes: ['optician'],
    textQuery: 'ópticas em {zona}',
    textQueryBR: 'óticas em {zona}',
    foodService: false,
  },
  {
    slug: 'psicologo',
    // Sem tipo no Google. Ver a nota em `includedTypes`: dar-lhe `doctor` para
    // não ficar vazio devolvia clínica geral e cobrava-se por isso.
    label: 'Psicólogo',
    grupo: 'Profissionais e saúde',
    includedTypes: [],
    textQuery: 'psicólogos em {zona}',
    foodService: false,
  },
  {
    slug: 'nutricionista',
    label: 'Nutricionista',
    grupo: 'Profissionais e saúde',
    includedTypes: [],
    textQuery: 'nutricionistas em {zona}',
    foodService: false,
  },
  {
    slug: 'podologia',
    label: 'Podologia',
    grupo: 'Profissionais e saúde',
    includedTypes: [],
    textQuery: 'podologistas em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Procedimentos de estética, um a um
  //
  // O Google não tem tipo para nenhum destes, e é por isso que valem a pena:
  // quem procura "harmonização facial" procura pelo nome do procedimento, e
  // quem o oferece costuma ter só Instagram. A pesquisa por texto é o
  // instrumento certo — é literalmente assim que um cliente os procura.
  // -------------------------------------------------------------------------
  {
    slug: 'harmonizacao-facial',
    label: 'Harmonização facial',
    grupo: 'Estética',
    includedTypes: [],
    textQuery: 'harmonização facial em {zona}',
    foodService: false,
  },
  {
    slug: 'depilacao-laser',
    label: 'Depilação a laser',
    grupo: 'Estética',
    includedTypes: [],
    textQuery: 'depilação a laser em {zona}',
    foodService: false,
  },
  {
    slug: 'micropigmentacao',
    label: 'Micropigmentação',
    grupo: 'Estética',
    includedTypes: [],
    textQuery: 'micropigmentação e microblading em {zona}',
    foodService: false,
  },
  {
    slug: 'manicure',
    label: 'Manicure / unhas',
    grupo: 'Estética',
    includedTypes: ['nail_salon'],
    textQuery: 'manicures e nail bars em {zona}',
    textQueryBR: 'manicures e estúdios de unhas em {zona}',
    foodService: false,
  },
  {
    slug: 'massagem',
    label: 'Massagem / terapias',
    grupo: 'Estética',
    includedTypes: ['massage'],
    textQuery: 'massagens e terapias em {zona}',
    foodService: false,
  },
  {
    slug: 'tatuagem',
    label: 'Estúdio de tatuagem',
    grupo: 'Estética',
    includedTypes: [],
    textQuery: 'estúdios de tatuagem em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Serviços e ofícios
  // -------------------------------------------------------------------------
  {
    slug: 'seguros',
    label: 'Mediador de seguros',
    grupo: 'Serviços e ofícios',
    includedTypes: ['insurance_agency'],
    textQuery: 'mediadores de seguros em {zona}',
    textQueryBR: 'corretores de seguros em {zona}',
    foodService: false,
  },
  {
    slug: 'escola-conducao',
    label: 'Escola de condução',
    grupo: 'Serviços e ofícios',
    includedTypes: ['driving_school'],
    textQuery: 'escolas de condução em {zona}',
    textQueryBR: 'autoescolas em {zona}',
    foodService: false,
  },
  {
    slug: 'agencia-viagens',
    label: 'Agência de viagens',
    grupo: 'Serviços e ofícios',
    includedTypes: ['travel_agency'],
    textQuery: 'agências de viagens em {zona}',
    foodService: false,
  },
  {
    slug: 'arquiteto',
    label: 'Arquitecto / decoração',
    grupo: 'Serviços e ofícios',
    includedTypes: [],
    textQuery: 'arquitectos e decoradores de interiores em {zona}',
    textQueryBR: 'arquitetos e designers de interiores em {zona}',
    foodService: false,
  },
  {
    slug: 'fotografo',
    label: 'Fotógrafo',
    grupo: 'Serviços e ofícios',
    includedTypes: [],
    textQuery: 'fotógrafos de casamentos e eventos em {zona}',
    foodService: false,
  },
  {
    slug: 'personal-trainer',
    label: 'Personal trainer',
    grupo: 'Serviços e ofícios',
    includedTypes: [],
    textQuery: 'personal trainers em {zona}',
    foodService: false,
  },
  {
    slug: 'eletricista',
    label: 'Electricista',
    grupo: 'Serviços e ofícios',
    includedTypes: ['electrician'],
    textQuery: 'electricistas em {zona}',
    textQueryBR: 'eletricistas em {zona}',
    foodService: false,
  },
  {
    slug: 'canalizador',
    label: 'Canalizador',
    grupo: 'Serviços e ofícios',
    includedTypes: ['plumber'],
    textQuery: 'canalizadores e picheleiros em {zona}',
    textQueryBR: 'encanadores em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Construção e obras
  //
  // Gente que vive de orçamentos e de quem a encontra. Um empreiteiro sem site
  // perde trabalho para quem tem um, e quase nenhum tem — é o ramo onde a
  // presença online está mais atrasada dos dois lados do Atlântico.
  // -------------------------------------------------------------------------
  {
    slug: 'materiais-construcao',
    label: 'Materiais de construção',
    grupo: 'Construção e obras',
    includedTypes: ['hardware_store', 'home_improvement_store'],
    textQuery: 'lojas de materiais de construção em {zona}',
    textQueryBR: 'lojas de material de construção em {zona}',
    foodService: false,
  },
  {
    slug: 'construtora',
    label: 'Construtora / empreiteiro',
    grupo: 'Construção e obras',
    includedTypes: ['general_contractor'],
    textQuery: 'construtoras e empreiteiros de construção civil em {zona}',
    textQueryBR: 'construtoras e empreiteiras em {zona}',
    foodService: false,
  },
  {
    slug: 'pintor',
    label: 'Pintor / pinturas',
    grupo: 'Construção e obras',
    includedTypes: ['painter'],
    textQuery: 'pintores e empresas de pintura em {zona}',
    foodService: false,
  },
  {
    // Sem tipo no Google, e é dos casos em que isso é uma sorte: quem vende
    // extintores é procurado pelo nome do produto, não por um ramo.
    slug: 'anti-incendio',
    label: 'Segurança contra incêndio',
    grupo: 'Construção e obras',
    includedTypes: [],
    textQuery: 'extintores e material de combate a incêndio em {zona}',
    textQueryBR: 'extintores e equipamentos de combate a incêndio em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Transporte e entregas
  //
  // Vivem do telefone e quase nenhum tem site. A pergunta que o cliente faz é
  // sempre a mesma — quanto custa e quando chega — e é a que nenhum deles
  // responde online.
  // -------------------------------------------------------------------------
  {
    slug: 'transportadora',
    label: 'Transportadora',
    grupo: 'Transporte',
    includedTypes: ['moving_company'],
    textQuery: 'transportadoras e empresas de transporte de mercadorias em {zona}',
    textQueryBR: 'transportadoras em {zona}',
    foodService: false,
  },
  {
    slug: 'mudancas',
    label: 'Mudanças',
    grupo: 'Transporte',
    includedTypes: ['moving_company'],
    textQuery: 'empresas de mudanças em {zona}',
    textQueryBR: 'empresas de mudança e carreto em {zona}',
    foodService: false,
  },
  {
    // Sem tipo no Google: quem faz entregas locais aparece pelo serviço, não
    // por um ramo. Dar-lhe `moving_company` trazia empresas de mudanças, que
    // são outro negócio — e pagava-se por elas.
    slug: 'entregas',
    label: 'Entregas / estafetas',
    grupo: 'Transporte',
    includedTypes: [],
    textQuery: 'serviços de entregas e estafetas em {zona}',
    textQueryBR: 'serviços de entrega e motoboy em {zona}',
    foodService: false,
  },
  {
    slug: 'aluguer-viaturas',
    label: 'Aluguer de viaturas',
    grupo: 'Transporte',
    includedTypes: ['car_rental'],
    textQuery: 'aluguer de carrinhas e viaturas em {zona}',
    textQueryBR: 'locação de vans e caminhões em {zona}',
    foodService: false,
  },

  // -------------------------------------------------------------------------
  // Ensino privado
  //
  // Todas sem tipo, e DE PROPÓSITO. O Google tem `school`, mas `school` é a
  // escola primária da rua — o tipo é válido, não dá erro, devolve os
  // estabelecimentos errados e paga-se por eles. Uma escola de dança procura-se
  // pelo nome do que ensina, e é assim que se vai procurá-la.
  //
  // São bons prospetos por uma razão própria: vendem turmas que começam em
  // datas certas, portanto a página tem sempre o que anunciar.
  // -------------------------------------------------------------------------
  {
    slug: 'escola-musica',
    label: 'Escola de música',
    grupo: 'Ensino',
    includedTypes: [],
    textQuery: 'escolas de música em {zona}',
    foodService: false,
  },
  {
    slug: 'escola-danca',
    label: 'Escola de dança',
    grupo: 'Ensino',
    includedTypes: [],
    textQuery: 'escolas de dança em {zona}',
    foodService: false,
  },
  {
    slug: 'escola-teatro',
    label: 'Escola de teatro',
    grupo: 'Ensino',
    includedTypes: [],
    textQuery: 'escolas de teatro e de representação em {zona}',
    foodService: false,
  },
  {
    slug: 'escola-linguas',
    label: 'Escola de línguas',
    grupo: 'Ensino',
    includedTypes: [],
    textQuery: 'escolas de inglês e de línguas em {zona}',
    textQueryBR: 'cursos de inglês e escolas de idiomas em {zona}',
    foodService: false,
  },
] as const;

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** A consulta de texto na variante do país, com a zona já lá dentro. */
export function categoryTextQuery(
  category: CategoryDefinition,
  countryCode: string,
  zona: string,
): string {
  const base =
    countryCode.toUpperCase() === 'BR' ? (category.textQueryBR ?? category.textQuery) : category.textQuery;
  return base.replace('{zona}', zona);
}

/** true quando o ramo não tem tipo no Google e só se procura por texto. */
export function isTextOnly(category: CategoryDefinition): boolean {
  return category.includedTypes.length === 0;
}

/** Aceita o slug ou o rótulo, sem distinguir maiúsculas nem acentos. */
export function findCategory(input: string): CategoryDefinition | null {
  const normalized = normalizeKey(input);

  const direct = BY_SLUG.get(normalized);
  if (direct) return direct;

  return (
    CATEGORIES.find(
      (c) => normalizeKey(c.label) === normalized || normalizeKey(c.slug) === normalized,
    ) ?? null
  );
}

/** Minúsculas, sem acentos, espaços e barras convertidos em hífen. */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s/_]+/g, '-');
}

/** Os ramos agrupados, na ordem de `GRUPOS`, para a caixa de escolha. */
export function categoriesByGroup(): { grupo: Grupo; ramos: CategoryDefinition[] }[] {
  return GRUPOS.map((grupo) => ({
    grupo,
    ramos: CATEGORIES.filter((c) => c.grupo === grupo),
  })).filter((g) => g.ramos.length > 0);
}

export function categorySlugs(): string[] {
  return CATEGORIES.map((c) => c.slug);
}
