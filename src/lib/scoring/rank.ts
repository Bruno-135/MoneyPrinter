import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { WebsiteKind } from '@/lib/places/website';
import type { DealStage } from '@/lib/deals/stages';
import { scoreLabel } from './score';
import { DEFAULT_SORT, type ProspectSort } from './sort';

/**
 * A lista ordenada de comércios — o ecrã principal do produto.
 *
 * A ordem por omissão é o score decrescente e, em empate, o número de
 * avaliações: entre dois prospetos igualmente prováveis, o maior negócio vale
 * mais o telefonema. Há outras, e a razão de existirem está em `sort.ts`.
 *
 * Lê da vista `businesses_with_stage` e não da tabela. A razão está na migração
 * 0016, e vale a pena repeti-la: com a negociação embutida (`deals(stage)`), um
 * filtro por estado decidia que negociações vinham agarradas, não que comércios
 * apareciam — o filtro parecia funcionar e mentia. Com o estado como coluna,
 * filtrar é `where stage in (...)` e não há como enganar ninguém.
 *
 * Os filtros são todos LISTAS, e não valores soltos, porque no ecrã são caixas
 * para marcar à maneira do Excel: marcam-se três estados e veem-se os três.
 * Uma lista vazia significa "não filtrar por isto", e nunca "não mostrar nada".
 */

type Db = SupabaseClient<Database>;

/** Presença online: é o eixo que separa um prospeto de quem já está servido. */
export const WEBSITE_KINDS = ['none', 'social_only', 'real'] as const;
export type WebsiteKindFilter = (typeof WEBSITE_KINDS)[number];

/**
 * O que se vê sem mexer em nada: quem não tem site e quem só tem rede social.
 *
 * Quem já tem site a sério não é prospeto, e enchia a lista com quem não se vai
 * contactar. Continua a estar a uma caixinha de distância.
 */
export const DEFAULT_KINDS: readonly WebsiteKindFilter[] = ['none', 'social_only'];

export const WEBSITE_KIND_LABELS: Record<WebsiteKindFilter, string> = {
  none: 'Sem site',
  social_only: 'Só rede social',
  real: 'Tem site',
};

export function isWebsiteKind(value: unknown): value is WebsiteKindFilter {
  return typeof value === 'string' && (WEBSITE_KINDS as readonly string[]).includes(value);
}

export interface RankOptions {
  /** Tipos de presença online a mostrar. Vazio = todos. */
  kinds?: readonly WebsiteKindFilter[];
  /** Estados da negociação a mostrar. Vazio = todos. */
  stages?: readonly DealStage[];
  /** Comércios a mostrar, por identificador. Vazio = todos. */
  businessIds?: readonly string[];
  category?: string | null;
  locality?: string | null;
  /**
   * Mostra só os comércios que saíram de um varrimento.
   *
   * Um comércio encontrado por duas procuras fica com a última — ver a nota na
   * migração 0013. Para o filtro do painel é o que interessa: a resposta a "o
   * que é que esta procura me deu" inclui o que já era conhecido de antes.
   */
  regionId?: string | null;
  /** Por que ordem se mostra. Ver `sort.ts`. */
  sort?: ProspectSort;
  limit?: number;
  offset?: number;
}

export interface RankedBusiness {
  id: string;
  /** Necessário para montar o link do Google Maps sem chamar a API. */
  googlePlaceId: string;
  name: string;
  category: string;
  score: number;
  label: string;
  websiteKind: WebsiteKind;
  websiteUrl: string | null;
  rating: number | null;
  reviewsCount: number | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  /** Servem a ligação para o Google Maps, que precisa de um alvo alternativo
   *  para o caso de o identificador do sítio ter deixado de resolver. */
  latitude: number | null;
  longitude: number | null;
  /** Quando o último varrimento tocou neste comércio. É por aqui que se ordena
   *  "vistos na última procura": todo um varrimento sobe junto ao topo. */
  lastSyncedAt: string | null;
  /** Quando entrou na base de dados pela primeira vez. */
  firstSeenAt: string | null;
  countryCode: string;
  isFoodService: boolean;
  scoreBreakdown: unknown;
  /** Um comércio sem linha em `deals` conta como 'new' — por contactar. */
  stage: DealStage;
  nextActionAt: string | null;
}

export interface RankResult {
  businesses: RankedBusiness[];
  total: number;
}

const SELECT = [
  'id', 'google_place_id', 'name', 'business_category', 'score', 'score_breakdown',
  'website_kind', 'website_url', 'rating', 'reviews_count',
  'phone_e164', 'phone_raw', 'formatted_address', 'locality', 'latitude', 'longitude',
  'first_seen_at', 'last_synced_at',
  'country_code', 'is_food_service',
  // Vêm da vista, já resolvidos: sem linha em `deals`, o estado é 'new'.
  'stage', 'next_action_at',
].join(',');

/**
 * O pouco que este ficheiro precisa de saber sobre o construtor de consultas.
 *
 * Descrito por aquilo que faz, em vez de importar o tipo do PostgREST: os
 * filtros devolvem sempre o próprio construtor, e é só disso que aqui se
 * precisa para os poder encadear.
 */
interface Filterable {
  in(column: string, values: readonly unknown[]): this;
  eq(column: string, value: unknown): this;
  ilike(column: string, pattern: string): this;
}

/** Aplica os filtros comuns à lista e às caixas, para não divergirem. */
function applyFilters<T extends Filterable>(query: T, options: RankOptions): T {
  const { kinds = [], stages = [], businessIds = [], category = null, locality = null, regionId = null } = options;

  let q = query;

  if (kinds.length > 0) q = q.in('website_kind', kinds);
  if (stages.length > 0) q = q.in('stage', stages);
  if (businessIds.length > 0) q = q.in('id', businessIds);
  if (regionId) q = q.eq('region_id', regionId);
  if (category) q = q.eq('business_category', category);
  if (locality) q = q.ilike('locality', locality);

  return q;
}

export async function rankBusinesses(db: Db, options: RankOptions = {}): Promise<RankResult> {
  const { sort = DEFAULT_SORT, limit = 50, offset = 0 } = options;

  let query = applyFilters(
    db.from('businesses_with_stage').select(SELECT, { count: 'exact' }).eq('is_archived', false),
    options,
  );

  // Cada ordem leva um critério de desempate, e nunca o mesmo por que já se
  // ordenou: sem ele, dois comércios com o mesmo valor trocavam de sítio entre
  // dois carregamentos da página, o que é a maneira mais fácil de fazer alguém
  // pensar que a lista está partida.
  switch (sort) {
    case 'adicionados':
      query = query
        .order('first_seen_at', { ascending: false, nullsFirst: false })
        .order('score', { ascending: false });
      break;
    case 'nome':
      query = query.order('name', { ascending: true });
      break;
    case 'recentes':
      query = query
        .order('last_synced_at', { ascending: false, nullsFirst: false })
        .order('score', { ascending: false });
      break;
    case 'avaliacoes':
      query = query
        .order('reviews_count', { ascending: false, nullsFirst: false })
        .order('score', { ascending: false });
      break;
    case 'score':
      query = query
        .order('score', { ascending: false })
        // Entre dois prospetos igualmente prováveis, o maior negócio vale mais
        // o telefonema.
        .order('reviews_count', { ascending: false, nullsFirst: false });
      break;
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Não foi possível ler a lista de comércios: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  return {
    total: count ?? rows.length,
    businesses: rows.map((row) => ({
      id: String(row.id),
      googlePlaceId: String(row.google_place_id),
      name: String(row.name),
      category: String(row.business_category),
      score: Number(row.score ?? 0),
      label: scoreLabel(Number(row.score ?? 0)),
      websiteKind: (row.website_kind ?? 'none') as WebsiteKind,
      websiteUrl: (row.website_url as string | null) ?? null,
      rating: (row.rating as number | null) ?? null,
      reviewsCount: (row.reviews_count as number | null) ?? null,
      phone: (row.phone_e164 as string | null) ?? (row.phone_raw as string | null) ?? null,
      address: (row.formatted_address as string | null) ?? null,
      locality: (row.locality as string | null) ?? null,
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
      lastSyncedAt: (row.last_synced_at as string | null) ?? null,
      firstSeenAt: (row.first_seen_at as string | null) ?? null,
      countryCode: String(row.country_code ?? ''),
      isFoodService: Boolean(row.is_food_service),
      scoreBreakdown: row.score_breakdown ?? {},
      stage: (row.stage ?? 'new') as DealStage,
      nextActionAt: (row.next_action_at as string | null) ?? null,
    })),
  };
}

/**
 * Os valores que cada caixa de filtro oferece, com quantos há de cada.
 *
 * Cada caixa é calculada com os filtros das OUTRAS caixas, e nunca com o dela
 * própria. É assim que o Excel faz e é a única maneira que funciona: se a caixa
 * do comércio se filtrasse a si mesma, escolher um comércio deixava-a com uma
 * opção só e ficava-se lá preso, sem maneira de trocar.
 */
export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export async function listFacet(
  db: Db,
  field: 'id' | 'stage' | 'website_kind',
  options: RankOptions,
): Promise<FacetValue[]> {
  const select = field === 'id' ? 'id, name' : field;

  const { data, error } = await applyFilters(
    db.from('businesses_with_stage').select(select).eq('is_archived', false),
    options,
  )
    .order(field === 'id' ? 'name' : field, { ascending: true })
    // Mil é muito mais do que uma pessoa escolhe de uma lista, e ao mesmo tempo
    // impede que um dia isto puxe a tabela inteira para dentro da página.
    .limit(1000);

  if (error) {
    throw new Error(`Não foi possível ler os valores do filtro: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  if (field === 'id') {
    return rows.map((row) => ({ value: String(row.id), label: String(row.name), count: 1 }));
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[field] ?? '');
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
}
