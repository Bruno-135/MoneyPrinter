import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { PlacesClient, MAX_RESULTS_PER_CALL } from './client';
import { buildGrid, type GridCell } from './grid';
import { findCategory, type CategoryDefinition } from './categories';
import { normalizePlace, type NormalizedBusiness } from './normalize';
import { classifyWebsite, type WebsiteKind } from './website';
import type { PlaceResult } from './types';

/**
 * Varrimento de uma região para um ramo de negócio.
 *
 * A ordem das operações é toda ela desenhada à volta de uma regra: nunca pagar
 * duas vezes pela mesma consulta.
 *
 *   1. a região+ramo já foi pesquisada há pouco?  ->  devolve o que está gravado
 *   2. gera a grelha e vê quais as células já feitas  ->  salta essas
 *   3. cada chamada é gravada logo a seguir, com a resposta em bruto
 *   4. os comércios são gravados com upsert pelo place id
 *
 * Em modo de simulação (`dryRun`, o padrão) nada disto chega a acontecer: só se
 * calcula a grelha e se estima o custo.
 */

/** Preço por chamada no escalão Enterprise, em USD. Só para estimar. */
const USD_PER_CALL = 0.035;

export interface ScanRequest {
  /** Nome da zona. Ex.: "Braga centro". */
  label: string;
  /** Ramo: slug ou rótulo. Ex.: "padaria". */
  category: string;
  /** Centro da região. */
  latitude: number;
  longitude: number;
  /** Raio da região, em metros. */
  regionRadiusMeters: number;
  /** Raio de cada célula da grelha. Entre 1000 e 2000. */
  cellRadiusMeters: number;
  /** País ISO-3166-1 alpha-2. */
  countryCode: string;
  /** Concelho/cidade, se conhecido. */
  locality?: string | null;

  /** true = não chama a API nem grava nada. Padrão do sistema. */
  dryRun: boolean;
  /** Aborta se o varrimento precisar de mais chamadas do que isto. */
  maxRequests: number;
  /** Dias até uma região pesquisada ser considerada velha. */
  cacheDays: number;
  /** Ignora a cache da região (mas nunca a das células já feitas). */
  force?: boolean;
}

export interface ScanSummary {
  region: { label: string; category: string; countryCode: string; regionId: string | null };
  dryRun: boolean;

  grid: { total: number; cached: number; toSearch: number; searched: number };
  api: { calls: number; failed: number; estimatedUsd: number; usedTextFallback: boolean };

  found: { total: number; created: number; updated: number };
  websites: Record<WebsiteKind, number>;
  prospects: number;

  /** Células que devolveram 20/20: pode haver mais comércios por descobrir. */
  saturatedCells: number;
  warnings: string[];
}

type Db = SupabaseClient<Database>;

function emptySummary(request: ScanRequest, category: CategoryDefinition): ScanSummary {
  return {
    region: {
      label: request.label,
      category: category.label,
      countryCode: request.countryCode.toUpperCase(),
      regionId: null,
    },
    dryRun: request.dryRun,
    grid: { total: 0, cached: 0, toSearch: 0, searched: 0 },
    api: { calls: 0, failed: 0, estimatedUsd: 0, usedTextFallback: false },
    found: { total: 0, created: 0, updated: 0 },
    websites: { none: 0, social_only: 0, real: 0 },
    prospects: 0,
    saturatedCells: 0,
    warnings: [],
  };
}

export async function scanRegion(
  db: Db,
  places: PlacesClient,
  request: ScanRequest,
): Promise<ScanSummary> {
  const category = findCategory(request.category);
  if (!category) {
    throw new Error(
      `Ramo desconhecido: "${request.category}". Ramos disponíveis: ` +
        `${(await import('./categories')).categorySlugs().join(', ')}`,
    );
  }

  const summary = emptySummary(request, category);
  const countryCode = request.countryCode.toUpperCase();

  const grid = buildGrid({
    center: { lat: request.latitude, lng: request.longitude },
    regionRadiusMeters: request.regionRadiusMeters,
    cellRadiusMeters: request.cellRadiusMeters,
  });
  summary.grid.total = grid.length;

  // ---------------------------------------------------------------------
  // Modo de simulação: mostra o plano e o custo, sem tocar em nada.
  // ---------------------------------------------------------------------
  if (request.dryRun) {
    summary.grid.toSearch = grid.length;
    summary.api.estimatedUsd = round2(grid.length * USD_PER_CALL);
    if (grid.length > request.maxRequests) {
      summary.warnings.push(
        `A grelha tem ${grid.length} pontos, acima do limite de ${request.maxRequests}. ` +
          `Aumenta o raio da célula, reduz a região, ou sobe --max-chamadas.`,
      );
    }
    return summary;
  }

  // ---------------------------------------------------------------------
  // 1. Cache da região
  // ---------------------------------------------------------------------
  const region = await upsertRegion(db, request, category, grid.length);
  summary.region.regionId = region.id;

  if (!request.force && region.freshUntilDays > 0) {
    summary.warnings.push(
      `Região pesquisada há ${region.ageDays} dias (validade ${request.cacheDays}). ` +
        `Nada foi consultado. Usa --forcar para procurar na mesma.`,
    );
    summary.grid.cached = grid.length;
    summary.found.total = region.placesFound;
    await fillWebsiteCounts(db, region.id, summary);
    return summary;
  }

  // ---------------------------------------------------------------------
  // 2. Células já feitas
  // ---------------------------------------------------------------------
  const done = await fetchDoneCells(db, region.id);
  const pending = grid.filter((cell) => !done.has(cell.key));

  summary.grid.cached = grid.length - pending.length;
  summary.grid.toSearch = pending.length;

  if (pending.length > request.maxRequests) {
    throw new Error(
      `O varrimento precisa de ${pending.length} chamadas, acima do limite de ` +
        `${request.maxRequests}. Nada foi consultado. Sobe --max-chamadas se for mesmo isto que queres.`,
    );
  }

  // ---------------------------------------------------------------------
  // 3. Percorrer as células
  // ---------------------------------------------------------------------
  const collected = new Map<string, PlaceResult>();
  let useTextFallback = false;

  for (const cell of pending) {
    const result = useTextFallback
      ? await places.searchText({
          textQuery: category.textQuery.replace('{zona}', request.locality ?? request.label),
          latitude: cell.lat,
          longitude: cell.lng,
          radiusMeters: cell.radiusMeters,
        })
      : await places.searchNearby({
          latitude: cell.lat,
          longitude: cell.lng,
          radiusMeters: cell.radiusMeters,
          includedTypes: category.includedTypes,
        });

    summary.api.calls += 1;

    // Tipo rejeitado pela Google: a resposta 400 não é faturada. Passa-se à
    // pesquisa por texto e repete-se esta mesma célula.
    if (!result.ok && result.invalidType && !useTextFallback) {
      useTextFallback = true;
      summary.api.usedTextFallback = true;
      summary.warnings.push(
        `A Google rejeitou os tipos [${category.includedTypes.join(', ')}] para "${category.label}". ` +
          `O varrimento passou à pesquisa por texto. Corrige o mapa em src/lib/places/categories.ts. ` +
          `Esta resposta não foi faturada.`,
      );
      await recordSearch(db, region.id, cell, result, null);
      const retry = await places.searchText({
        textQuery: category.textQuery.replace('{zona}', request.locality ?? request.label),
        latitude: cell.lat,
        longitude: cell.lng,
        radiusMeters: cell.radiusMeters,
      });
      summary.api.calls += 1;
      await handleResult(db, region.id, cell, retry, collected, summary);
      continue;
    }

    await handleResult(db, region.id, cell, result, collected, summary);
  }

  summary.api.estimatedUsd = round2(summary.api.calls * USD_PER_CALL);

  // ---------------------------------------------------------------------
  // 4. Gravar os comércios
  // ---------------------------------------------------------------------
  const rows: NormalizedBusiness[] = [];
  for (const place of collected.values()) {
    const row = normalizePlace(place, {
      categoryLabel: category.label,
      fallbackCountryCode: countryCode,
    });
    if (row) rows.push(row);
  }

  summary.found.total = rows.length;

  if (rows.length > 0) {
    const { created, updated } = await upsertBusinesses(db, region.id, rows);
    summary.found.created = created;
    summary.found.updated = updated;
  }

  for (const row of rows) {
    const kind = classifyWebsite(row.website_url);
    summary.websites[kind] += 1;
  }
  summary.prospects = summary.websites.none + summary.websites.social_only;

  await db
    .from('searched_regions')
    .update({
      last_searched_at: new Date().toISOString(),
      search_count: region.searchCount + 1,
      places_found: rows.length,
      new_places_last_search: summary.found.created,
      grid_cells_total: grid.length,
      saturated_cells: summary.saturatedCells,
      is_exhausted: summary.saturatedCells === 0,
    })
    .eq('id', region.id);

  if (summary.saturatedCells > 0) {
    summary.warnings.push(
      `${summary.saturatedCells} célula(s) devolveram o máximo de ${MAX_RESULTS_PER_CALL} resultados. ` +
        `Havia mais comércios e o Google cortou. Repete essa zona com um raio menor para os apanhar.`,
    );
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

async function handleResult(
  db: Db,
  regionId: string,
  cell: GridCell,
  result: Awaited<ReturnType<PlacesClient['searchNearby']>>,
  collected: Map<string, PlaceResult>,
  summary: ScanSummary,
): Promise<void> {
  if (!result.ok) {
    summary.api.failed += 1;
    summary.warnings.push(`Célula ${cell.key}: ${result.errorMessage ?? 'erro desconhecido'}`);
    await recordSearch(db, regionId, cell, result, null);
    return;
  }

  summary.grid.searched += 1;

  if (result.places.length >= MAX_RESULTS_PER_CALL) {
    summary.saturatedCells += 1;
  }

  for (const place of result.places) {
    if (place.id) collected.set(place.id, place);
  }

  await recordSearch(db, regionId, cell, result, cell.key);
}

/** Grava a chamada com a resposta completa. É daqui que se reprocessa sem pagar. */
async function recordSearch(
  db: Db,
  regionId: string,
  cell: GridCell,
  result: Awaited<ReturnType<PlacesClient['searchNearby']>>,
  gridCellKey: string | null,
): Promise<void> {
  await db.from('region_searches').insert({
    region_id: regionId,
    endpoint: result.endpoint,
    request_params: result.requestParams as never,
    response_raw: (result.raw ?? {}) as never,
    http_status: result.httpStatus,
    results_count: result.places.length,
    next_page_token: result.nextPageToken,
    error_message: result.errorMessage,
    grid_cell_key: gridCellKey,
  });
}

interface RegionState {
  id: string;
  ageDays: number;
  freshUntilDays: number;
  searchCount: number;
  placesFound: number;
}

async function upsertRegion(
  db: Db,
  request: ScanRequest,
  category: CategoryDefinition,
  gridCells: number,
): Promise<RegionState> {
  const payload = {
    label: request.label,
    business_category: category.slug,
    country_code: request.countryCode.toUpperCase(),
    locality: request.locality ?? null,
    center_lat: request.latitude,
    center_lng: request.longitude,
    radius_meters: request.regionRadiusMeters,
    grid_radius_meters: request.cellRadiusMeters,
    grid_cells_total: gridCells,
    search_query: `${category.label} @ ${request.label}`,
  };

  // `search_key` é uma coluna gerada, portanto não pode ir no conflito. A
  // procura pela linha existente faz-se pelos campos que a compõem.
  const { data: existing } = await db
    .from('searched_regions')
    .select('id, last_searched_at, search_count, places_found')
    .eq('business_category', category.slug)
    .eq('country_code', payload.country_code)
    .eq('radius_meters', request.regionRadiusMeters)
    .maybeSingle();

  if (existing) {
    await db.from('searched_regions').update(payload).eq('id', existing.id);
    const ageMs = Date.now() - new Date(existing.last_searched_at).getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);
    return {
      id: existing.id,
      ageDays,
      freshUntilDays: Math.max(0, request.cacheDays - ageDays),
      searchCount: existing.search_count,
      placesFound: existing.places_found,
    };
  }

  const { data, error } = await db
    .from('searched_regions')
    .insert(payload)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível registar a região: ${error?.message ?? 'sem dados'}`);
  }

  // Região nova: nunca pesquisada, portanto não há cache a respeitar.
  return { id: data.id, ageDays: 0, freshUntilDays: 0, searchCount: 0, placesFound: 0 };
}

async function fetchDoneCells(db: Db, regionId: string): Promise<Set<string>> {
  const { data } = await db
    .from('region_searches')
    .select('grid_cell_key')
    .eq('region_id', regionId)
    .is('error_message', null)
    .not('grid_cell_key', 'is', null);

  return new Set((data ?? []).map((r) => r.grid_cell_key).filter((k): k is string => k !== null));
}

async function upsertBusinesses(
  db: Db,
  regionId: string,
  rows: NormalizedBusiness[],
): Promise<{ created: number; updated: number }> {
  const ids = rows.map((r) => r.google_place_id);

  const { data: before } = await db
    .from('businesses')
    .select('google_place_id')
    .in('google_place_id', ids);

  const known = new Set((before ?? []).map((r) => r.google_place_id));

  const now = new Date().toISOString();
  const payload = rows.map((row) => ({
    ...row,
    region_id: regionId,
    google_raw: row.google_raw as never,
    social_links: row.social_links as never,
    opening_hours: (row.opening_hours ?? null) as never,
    google_fetched_at: now,
    last_synced_at: now,
  }));

  const { error } = await db
    .from('businesses')
    .upsert(payload, { onConflict: 'owner_id,google_place_id' });

  if (error) {
    throw new Error(`Não foi possível gravar os comércios: ${error.message}`);
  }

  const created = rows.filter((r) => !known.has(r.google_place_id)).length;
  return { created, updated: rows.length - created };
}

async function fillWebsiteCounts(db: Db, regionId: string, summary: ScanSummary): Promise<void> {
  const { data } = await db.from('businesses').select('website_kind').eq('region_id', regionId);

  for (const row of data ?? []) {
    const kind = (row.website_kind ?? 'none') as WebsiteKind;
    summary.websites[kind] += 1;
  }
  summary.prospects = summary.websites.none + summary.websites.social_only;
  summary.found.total = (data ?? []).length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
