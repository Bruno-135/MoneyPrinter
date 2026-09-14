import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { scoreLabel } from '@/lib/scoring/score';
import { lerMensagens } from '@/lib/outreach/repository';
import type { MensagemAbordagem } from '@/lib/ai/abordagem-texto';

/**
 * A fila de contacto: quem se vai ligar a seguir.
 *
 * Existe porque contactar alguém custava sete passos — abrir a lista, abrir a
 * ficha, rolar até às mensagens, copiar, ir ao WhatsApp, voltar, mudar o
 * estado. Com 1888 prospetos isso não é lento, é impossível, e é por isso que
 * o contador de contactados estava a zero.
 *
 * Quem entra na fila:
 *
 *   - é prospeto (sem site ou só rede social);
 *   - está por contactar;
 *   - e não está adiado para depois.
 *
 * Esse último ponto é o que faz "não atende" ser diferente de "não interessa".
 * Quem não atendeu continua por contactar — só não é hoje. Marca-se uma data e
 * a fila deixa de o mostrar até lá, em vez de o devolver a cada volta ou de o
 * dar como perdido, que seriam as duas maneiras fáceis de o tratar mal.
 */

type Db = SupabaseClient<Database>;

export interface ItemDaFila {
  id: string;
  name: string;
  category: string;
  locality: string | null;
  score: number;
  label: string;
  rating: number | null;
  reviewsCount: number | null;
  phone: string | null;
  websiteKind: string;
  websiteUrl: string | null;
  googlePlaceId: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  /** As mensagens já escritas para este comércio, se houver. */
  mensagens: MensagemAbordagem[];
}

export interface OpcoesDaFila {
  limite?: number;
  regionId?: string | null;
  categories?: readonly string[];
  countries?: readonly string[];
}

/**
 * Traz um lote e não um de cada vez.
 *
 * O ecrã mostra um comércio, mas carrega vinte e cinco. É isso que torna o
 * "seguinte" instantâneo: sem lote, cada contacto era uma ida ao servidor a
 * meio do trabalho, e a pausa é o que faz desistir ao décimo.
 */
export async function proximosContactos(
  db: Db,
  opcoes: OpcoesDaFila = {},
): Promise<ItemDaFila[]> {
  const { limite = 25, regionId = null, categories = [], countries = [] } = opcoes;

  let q = db
    .from('businesses_with_stage')
    .select(
      'id, name, business_category, locality, score, rating, reviews_count, phone_e164, phone_raw, website_kind, website_url, google_place_id, formatted_address, latitude, longitude, country_code',
    )
    .eq('is_archived', false)
    .eq('stage', 'new')
    .in('website_kind', ['none', 'social_only'])
    // Adiados ficam de fora até à data marcada. `or` e não dois filtros: quem
    // nunca foi adiado tem a coluna vazia e tem de entrar na mesma.
    .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
    .order('score', { ascending: false })
    .order('reviews_count', { ascending: false, nullsFirst: false })
    .limit(limite);

  if (regionId) q = q.eq('region_id', regionId);
  if (categories.length > 0) q = q.in('business_category', categories);
  if (countries.length > 0) q = q.in('country_code', countries);

  const { data, error } = await q;
  if (error) throw new Error(`Não foi possível montar a fila: ${error.message}`);

  const linhas = data ?? [];
  if (linhas.length === 0) return [];

  // As mensagens já escritas, numa consulta só. Uma por comércio seria
  // vinte e cinco idas ao servidor para encher um ecrã.
  const { data: escritas } = await db
    .from('outreach_messages')
    .select('business_id, variants')
    .in(
      'business_id',
      linhas.map((b) => b.id),
    );

  const porComercio = new Map(
    (escritas ?? []).map((m) => [m.business_id, lerMensagens(m.variants)]),
  );

  return linhas.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.business_category,
    locality: b.locality,
    score: b.score ?? 0,
    label: scoreLabel(b.score ?? 0),
    rating: b.rating,
    reviewsCount: b.reviews_count,
    phone: b.phone_e164 ?? b.phone_raw ?? null,
    websiteKind: b.website_kind ?? 'none',
    websiteUrl: b.website_url,
    googlePlaceId: b.google_place_id,
    address: b.formatted_address,
    latitude: b.latitude,
    longitude: b.longitude,
    countryCode: b.country_code,
    mensagens: porComercio.get(b.id) ?? [],
  }));
}

/** Quantos ainda faltam contactar, para a fila poder dizer onde vai. */
export async function quantosPorContactar(
  db: Db,
  opcoes: OpcoesDaFila = {},
): Promise<number> {
  const { regionId = null, categories = [], countries = [] } = opcoes;

  let q = db
    .from('businesses_with_stage')
    .select('id', { count: 'exact', head: true })
    .eq('is_archived', false)
    .eq('stage', 'new')
    .in('website_kind', ['none', 'social_only'])
    .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`);

  if (regionId) q = q.eq('region_id', regionId);
  if (categories.length > 0) q = q.in('business_category', categories);
  if (countries.length > 0) q = q.in('country_code', countries);

  const { count } = await q;
  return count ?? 0;
}
