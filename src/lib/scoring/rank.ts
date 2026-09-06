import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { WebsiteKind } from '@/lib/places/website';
import { scoreLabel } from './score';

/**
 * A lista ordenada de comércios — o ecrã principal do produto, ainda sem ecrã.
 *
 * A ordenação é por score decrescente e, em empate, por número de avaliações:
 * entre dois prospetos igualmente prováveis, o maior negócio vale mais o
 * telefonema.
 */

export type ProspectFilter = 'todos' | 'prospetos' | 'sem-site' | 'so-rede-social';

export interface RankOptions {
  /** Por omissão só mostra prospetos: quem já tem site não interessa. */
  filter?: ProspectFilter;
  category?: string | null;
  locality?: string | null;
  limit?: number;
  offset?: number;
}

export interface RankedBusiness {
  id: string;
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
  countryCode: string;
  isFoodService: boolean;
  scoreBreakdown: unknown;
}

export interface RankResult {
  businesses: RankedBusiness[];
  total: number;
}

const SELECT = [
  'id', 'name', 'business_category', 'score', 'score_breakdown',
  'website_kind', 'website_url', 'rating', 'reviews_count',
  'phone_e164', 'phone_raw', 'formatted_address', 'locality',
  'country_code', 'is_food_service',
].join(',');

export async function rankBusinesses(
  db: SupabaseClient<Database>,
  options: RankOptions = {},
): Promise<RankResult> {
  const { filter = 'prospetos', category = null, locality = null, limit = 50, offset = 0 } = options;

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

  if (category) query = query.eq('business_category', category);
  if (locality) query = query.ilike('locality', locality);

  const { data, count, error } = await query
    .order('score', { ascending: false })
    .order('reviews_count', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Não foi possível ler a lista de comércios: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  return {
    total: count ?? rows.length,
    businesses: rows.map((row) => ({
      id: String(row.id),
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
      countryCode: String(row.country_code ?? ''),
      isFoodService: Boolean(row.is_food_service),
      scoreBreakdown: row.score_breakdown ?? {},
    })),
  };
}
