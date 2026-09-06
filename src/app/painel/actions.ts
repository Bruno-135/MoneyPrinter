'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import { PlacesClient } from '@/lib/places/client';
import { scanRegion, type ScanSummary } from '@/lib/places/scan';
import { findCategory } from '@/lib/places/categories';

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

export async function runScan(_previous: ScanFormState, formData: FormData): Promise<ScanFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const zona = String(formData.get('zona') ?? '').trim();
  const ramo = String(formData.get('ramo') ?? '').trim();
  const latitude = Number(formData.get('latitude'));
  const longitude = Number(formData.get('longitude'));
  const raio = Number(formData.get('raio') ?? 2000);
  const celula = Number(formData.get('celula') ?? 1500);
  const pais = String(formData.get('pais') ?? 'PT').toUpperCase();
  const confirmar = formData.get('confirmar') === 'sim';
  const forcar = formData.get('forcar') === 'sim';

  if (zona === '') return { summary: null, error: 'Dá um nome à zona.' };
  if (!findCategory(ramo)) return { summary: null, error: `Ramo desconhecido: ${ramo}` };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { summary: null, error: 'Latitude e longitude têm de ser números.' };
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
