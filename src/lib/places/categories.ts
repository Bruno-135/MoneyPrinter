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
  /** Tipos do Places para a pesquisa por proximidade. */
  includedTypes: string[];
  /**
   * Consulta de texto de recurso, usada quando o tipo não existe ou a Google o
   * rejeita. O `{zona}` é substituído pelo nome da região.
   */
  textQuery: string;
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
] as const;

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

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
