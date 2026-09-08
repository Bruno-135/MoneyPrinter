'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import { PlacesClient } from '@/lib/places/client';
import { scanRegion, type ScanSummary } from '@/lib/places/scan';
import { findCategory } from '@/lib/places/categories';
import { searchCities } from '@/lib/places/city-search';
import type { CityMatch } from '@/lib/places/cities';
import { clampRadius } from '@/lib/places/cities';

/**
 * Ações do painel.
 *
 * Correm no servidor, com a sessão do utilizador que está no browser. É por isso
 * que não é preciso segredo nenhum aqui: a chave da Google nunca sai do
 * servidor, e as escritas na base de dados passam pela RLS com o `owner_id` a
 * ser preenchido pelo `default auth.uid()`.
 */

export interface ScanFormState {
  summary: ScanSummary | null;
  error: string | null;
}

export interface CityFormState {
  cities: CityMatch[];
  /** true quando a resposta veio do cache e não custou nada. */
  fromCache: boolean;
  /** O que foi procurado, para o ecrã poder dizer "nada encontrado para X". */
  query: string;
  error: string | null;
}

/**
 * Procura uma cidade pelo nome e devolve as que o Google conhece.
 *
 * É uma chamada paga, e por isso passa pelo cache antes de sair para a rede —
 * ver `city-search.ts`. O resultado volta como valor e não por exceção: quem
 * está a escrever o nome de uma cidade não pode ser atirado para um ecrã de
 * erro do Next por causa de uma falha de rede.
 */
export async function findCity(
  _previous: CityFormState,
  formData: FormData,
): Promise<CityFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const query = String(formData.get('cidade') ?? '').trim().slice(0, 120);
  const pais = String(formData.get('pais') ?? 'PT').toUpperCase() === 'BR' ? 'BR' : 'PT';

  if (query === '') {
    return { cities: [], fromCache: false, query: '', error: 'Escreve o nome de uma cidade.' };
  }

  const env = getServerEnv();
  const result = await searchCities(
    supabase,
    new PlacesClient({ apiKey: env.GOOGLE_PLACES_API_KEY, regionCode: pais }),
    query,
    pais,
  );

  return { cities: result.cities, fromCache: result.fromCache, query, error: result.error };
}

export async function runScan(_previous: ScanFormState, formData: FormData): Promise<ScanFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const zona = String(formData.get('zona') ?? '').trim();
  const ramo = String(formData.get('ramo') ?? '').trim();
  const latitude = Number(formData.get('latitude'));
  const longitude = Number(formData.get('longitude'));
  // O raio já não se pergunta: vem da área que a cidade ocupa, calculada quando
  // se escolheu a cidade. Continua a passar pelos limites, porque um valor vindo
  // de um formulário nunca é de confiança.
  const raio = clampRadius(Number(formData.get('raio') ?? 5000));
  const celula = Number(formData.get('celula') ?? 1500);
  const pais = String(formData.get('pais') ?? 'PT').toUpperCase();
  const confirmar = formData.get('confirmar') === 'sim';
  const forcar = formData.get('forcar') === 'sim';

  if (zona === '') return { summary: null, error: 'Dá um nome à zona.' };
  if (!findCategory(ramo)) return { summary: null, error: `Ramo desconhecido: ${ramo}` };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { summary: null, error: 'Escolhe uma cidade da lista antes de procurar.' };
  }

  const env = getServerEnv();

  try {
    const summary = await scanRegion(
      supabase,
      new PlacesClient({ apiKey: env.GOOGLE_PLACES_API_KEY, regionCode: pais }),
      {
        label: zona,
        category: ramo,
        latitude,
        longitude,
        regionRadiusMeters: raio,
        cellRadiusMeters: celula,
        countryCode: pais,
        locality: zona,
        dryRun: !confirmar,
        maxRequests: 60,
        cacheDays: env.REGION_SEARCH_CACHE_DAYS,
        force: forcar,
      },
    );

    if (confirmar) revalidatePath('/painel');
    return { summary, error: null };
  } catch (cause) {
    return { summary: null, error: cause instanceof Error ? cause.message : String(cause) };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
