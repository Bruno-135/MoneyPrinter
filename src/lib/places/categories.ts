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

export interface CategoryDefinition {
  /** Identificador estável usado na linha de comandos e na base de dados. */
  slug: string;
  /** Nome mostrado ao utilizador. */
  label: string;
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
    includedTypes: ['restaurant'],
    textQuery: 'restaurantes em {zona}',
    foodService: true,
  },
  {
    slug: 'padaria',
    label: 'Padaria',
    includedTypes: ['bakery'],
    textQuery: 'padarias em {zona}',
    foodService: true,
  },
  {
    slug: 'cabeleireiro',
    label: 'Cabeleireiro',
    includedTypes: ['hair_salon', 'hair_care'],
    textQuery: 'cabeleireiros em {zona}',
    foodService: false,
  },
  {
    slug: 'barbearia',
    label: 'Barbearia',
    includedTypes: ['barber_shop'],
    textQuery: 'barbearias em {zona}',
    foodService: false,
  },
  {
    slug: 'salao-beleza',
    label: 'Salão de beleza',
    includedTypes: ['beauty_salon'],
    textQuery: 'salões de beleza em {zona}',
    foodService: false,
  },
  {
    slug: 'ginasio',
    label: 'Ginásio',
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
    includedTypes: ['yoga_studio'],
    textQuery: 'estúdio de pilates ou yoga em {zona}',
    foodService: false,
  },
  {
    slug: 'oficina',
    label: 'Oficina mecânica',
    includedTypes: ['car_repair'],
    textQuery: 'oficinas mecânicas em {zona}',
    foodService: false,
  },
  {
    slug: 'pet-shop',
    label: 'Pet shop',
    includedTypes: ['pet_store'],
    textQuery: 'pet shops em {zona}',
    foodService: false,
  },
  {
    slug: 'clinica-dentaria',
    label: 'Clínica dentária',
    includedTypes: ['dentist'],
    textQuery: 'clínicas dentárias em {zona}',
    foodService: false,
  },
  {
    slug: 'fisioterapia',
    label: 'Clínica de fisioterapia',
    includedTypes: ['physiotherapist'],
    textQuery: 'clínicas de fisioterapia em {zona}',
    foodService: false,
  },
  {
    slug: 'advogados',
    label: 'Escritório de advogados',
    includedTypes: ['lawyer'],
    textQuery: 'escritórios de advogados em {zona}',
    foodService: false,
  },
  {
    slug: 'contabilidade',
    label: 'Contabilidade',
    includedTypes: ['accounting'],
    textQuery: 'contabilistas em {zona}',
    foodService: false,
  },
  {
    slug: 'loja-roupa',
    label: 'Loja de roupa',
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
    includedTypes: ['real_estate_agency'],
    textQuery: 'imobiliárias em {zona}',
    foodService: false,
  },
  {
    slug: 'medico',
    label: 'Médico / consultório',
    includedTypes: ['doctor'],
    textQuery: 'consultórios médicos em {zona}',
    foodService: false,
  },
  {
    slug: 'clinica-estetica',
    label: 'Clínica de estética',
    includedTypes: ['skin_care_clinic'],
    textQuery: 'clínicas de estética em {zona}',
    foodService: false,
  },
  {
    slug: 'veterinario',
    label: 'Veterinário',
    includedTypes: ['veterinary_care'],
    textQuery: 'clínicas veterinárias em {zona}',
    foodService: false,
  },
  {
    slug: 'optica',
    label: 'Óptica',
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
    includedTypes: [],
    textQuery: 'psicólogos em {zona}',
    foodService: false,
  },
  {
    slug: 'nutricionista',
    label: 'Nutricionista',
    includedTypes: [],
    textQuery: 'nutricionistas em {zona}',
    foodService: false,
  },
  {
    slug: 'podologia',
    label: 'Podologia',
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
    includedTypes: [],
    textQuery: 'harmonização facial em {zona}',
    foodService: false,
  },
  {
    slug: 'depilacao-laser',
    label: 'Depilação a laser',
    includedTypes: [],
    textQuery: 'depilação a laser em {zona}',
    foodService: false,
  },
  {
    slug: 'micropigmentacao',
    label: 'Micropigmentação',
    includedTypes: [],
    textQuery: 'micropigmentação e microblading em {zona}',
    foodService: false,
  },
  {
    slug: 'manicure',
    label: 'Manicure / unhas',
    includedTypes: ['nail_salon'],
    textQuery: 'manicures e nail bars em {zona}',
    textQueryBR: 'manicures e estúdios de unhas em {zona}',
    foodService: false,
  },
  {
    slug: 'massagem',
    label: 'Massagem / terapias',
    includedTypes: ['massage'],
    textQuery: 'massagens e terapias em {zona}',
    foodService: false,
  },
  {
    slug: 'tatuagem',
    label: 'Estúdio de tatuagem',
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
    includedTypes: ['insurance_agency'],
    textQuery: 'mediadores de seguros em {zona}',
    textQueryBR: 'corretores de seguros em {zona}',
    foodService: false,
  },
  {
    slug: 'escola-conducao',
    label: 'Escola de condução',
    includedTypes: ['driving_school'],
    textQuery: 'escolas de condução em {zona}',
    textQueryBR: 'autoescolas em {zona}',
    foodService: false,
  },
  {
    slug: 'agencia-viagens',
    label: 'Agência de viagens',
    includedTypes: ['travel_agency'],
    textQuery: 'agências de viagens em {zona}',
    foodService: false,
  },
  {
    slug: 'arquiteto',
    label: 'Arquitecto / decoração',
    includedTypes: [],
    textQuery: 'arquitectos e decoradores de interiores em {zona}',
    textQueryBR: 'arquitetos e designers de interiores em {zona}',
    foodService: false,
  },
  {
    slug: 'fotografo',
    label: 'Fotógrafo',
    includedTypes: [],
    textQuery: 'fotógrafos de casamentos e eventos em {zona}',
    foodService: false,
  },
  {
    slug: 'personal-trainer',
    label: 'Personal trainer',
    includedTypes: [],
    textQuery: 'personal trainers em {zona}',
    foodService: false,
  },
  {
    slug: 'eletricista',
    label: 'Electricista',
    includedTypes: ['electrician'],
    textQuery: 'electricistas em {zona}',
    textQueryBR: 'eletricistas em {zona}',
    foodService: false,
  },
  {
    slug: 'canalizador',
    label: 'Canalizador',
    includedTypes: ['plumber'],
    textQuery: 'canalizadores em {zona}',
    textQueryBR: 'encanadores em {zona}',
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

export function categorySlugs(): string[] {
  return CATEGORIES.map((c) => c.slug);
}
