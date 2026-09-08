import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { WebsiteKind } from '@/lib/places/website';
import type { DealStage } from '@/lib/deals/stages';
import { scoreLabel } from './score';
import { DEFAULT_SORT, type ProspectSort } from './sort';

/**
 * A lista ordenada de comércios — o ecrã principal do produto, ainda sem ecrã.
 *
 * A ordem por omissão é o score decrescente e, em empate, o número de
 * avaliações: entre dois prospetos igualmente prováveis, o maior negócio vale
 * mais o telefonema. Há outras, e a razão de existirem está em `sort.ts`.
 */

export type ProspectFilter = 'todos' | 'prospetos' | 'sem-site' | 'so-rede-social';

export interface RankOptions {
  /** Por omissão só mostra prospetos: quem já tem site não interessa. */
  filter?: ProspectFilter;
  category?: string | null;
  locality?: string | null;
  /** Mostra um único comércio, escolhido da lista. */
  businessId?: string | null;
  /**
   * Mostra só os comércios que saíram de um varrimento.
   *
   * Um comércio encontrado por duas procuras fica com a última — ver a nota na
   * migração 0013. Para o filtro do painel é o que interessa: a resposta a "o
   * que é que esta procura me deu" inclui o que já era conhecido de antes.
   */
  regionId?: string | null;
  /** Filtra por estado da negociação. 'por-contactar' inclui quem ainda não tem negociação. */
  stage?: DealStage | 'por-contactar' | null;
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
   *  "encontrados há menos tempo": todo um varrimento sobe junto ao topo. */
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
  // A negociação vem embutida. PostgREST devolve uma lista mesmo havendo no
  // máximo uma (a restrição única é composta e ele não a reconhece como
  // um-para-um), por isso lê-se o primeiro elemento.
  'deals(stage,next_action_at)',
].join(',');

/** PostgREST devolve a negociação embutida como lista; aqui reduz-se a um objeto. */
function dealFields(raw: unknown): { stage: DealStage; nextActionAt: string | null } {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== 'object') return { stage: 'new', nextActionAt: null };

  const deal = first as { stage?: DealStage; next_action_at?: string | null };
  return { stage: deal.stage ?? 'new', nextActionAt: deal.next_action_at ?? null };
}

export async function rankBusinesses(
  db: SupabaseClient<Database>,
  options: RankOptions = {},
): Promise<RankResult> {
  const {
    filter = 'prospetos',
    category = null,
    locality = null,
    businessId = null,
    regionId = null,
    stage = null,
    sort = DEFAULT_SORT,
    limit = 50,
    offset = 0,
  } = options;

  let query = db
    .from('businesses')
    .select(SELECT, { count: 'exact' })
    .eq('is_archived', false);

  switch (filter) {
    case 'prospetos':
      query = query.neq('website_kind', 'real');
      break;
    case 'sem-site':
      query = query.eq('website_kind', 'none');
      break;
    case 'so-rede-social':
      query = query.eq('website_kind', 'social_only');
      break;
    case 'todos':
      break;
  }

  if (regionId) query = query.eq('region_id', regionId);
  if (businessId) query = query.eq('id', businessId);
  if (category) query = query.eq('business_category', category);
  if (locality) query = query.ilike('locality', locality);

  // 'por-contactar' é o único filtro que também tem de apanhar os comércios
  // sem negociação nenhuma, que são a maioria logo depois de um varrimento.
  if (stage === 'por-contactar') {
    query = query.or('stage.is.null,stage.eq.new', { referencedTable: 'deals' });
  } else if (stage) {
    query = query.eq('deals.stage', stage).not('deals', 'is', null);
  }

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
      ...dealFields(row.deals),
    })),
  };
}


/**
 * Os nomes para o seletor de comércio.
 *
 * Leva os MESMOS filtros da lista menos o do próprio comércio. Se levasse
 * também esse, escolher um comércio deixava o seletor com uma opção só — e
 * ficava-se preso lá dentro, sem maneira de trocar para outro.
 *
 * Traz só o identificador e o nome: é uma lista para escolher, não linhas para
 * mostrar, e puxar tudo o resto seria carregar a página com dados que ninguém
 * vê.
 */
export async function listBusinessOptions(
  db: SupabaseClient<Database>,
  options: Omit<RankOptions, 'businessId' | 'sort' | 'limit' | 'offset'> = {},
): Promise<Array<{ id: string; name: string }>> {
  const { filter = 'prospetos', regionId = null, stage = null } = options;

  // O estado da negociação vive noutra tabela, portanto só se pede a junção
  // quando se filtra por ele — pedi-la sempre seria trabalho a mais na base de
  // dados por causa de um filtro que quase nunca está posto.
  let query = db
    .from('businesses')
    .select(stage ? 'id, name, deals(stage)' : 'id, name')
    .eq('is_archived', false);

  switch (filter) {
    case 'prospetos':
      query = query.neq('website_kind', 'real');
      break;
    case 'sem-site':
      query = query.eq('website_kind', 'none');
      break;
    case 'so-rede-social':
      query = query.eq('website_kind', 'social_only');
      break;
    case 'todos':
      break;
  }

  if (regionId) query = query.eq('region_id', regionId);

  if (stage === 'por-contactar') {
    query = query.or('stage.is.null,stage.eq.new', { referencedTable: 'deals' });
  } else if (stage) {
    query = query.eq('deals.stage', stage).not('deals', 'is', null);
  }

  // Mil nomes é muito mais do que uma pessoa escolhe de uma lista, e ao mesmo
  // tempo impede que um dia isto puxe a tabela inteira para dentro da página.
  const { data, error } = await query.order('name', { ascending: true }).limit(1000);

  if (error) {
    throw new Error(`Não foi possível ler a lista de comércios: ${error.message}`);
  }

  return ((data ?? []) as unknown as Array<{ id: string; name: string }>).map((row) => ({
    id: String(row.id),
    name: String(row.name),
  }));
}
