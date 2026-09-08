import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { findCategory } from './categories';

/**
 * A lista dos varrimentos já feitos, cada um com as suas contas.
 *
 * Serve o filtro do painel: com duas ou três procuras feitas, a lista de
 * prospetos ordenada por score misturava as padarias de Braga com os
 * cabeleireiros, e não havia maneira de ver só o que tinha acabado de sair da
 * última. Cada varrimento é um lote, e um lote é o que se trabalha ao telefone
 * numa tarde.
 *
 * Lê da vista `region_prospects` (migração 0013) para as contas virem feitas da
 * base de dados, em vez de trazer todas as linhas para as contar aqui.
 */

type Db = SupabaseClient<Database>;

export interface SearchBatch {
  regionId: string;
  /** Nome da zona, como foi escrito na procura. */
  label: string;
  /** Nome do ramo já traduzido: "Padaria" e não "padaria". */
  categoryLabel: string;
  categorySlug: string;
  lastSearchedAt: string;
  businesses: number;
  prospects: number;
  withoutSite: number;
  socialOnly: number;
}

export async function listSearchBatches(db: Db): Promise<SearchBatch[]> {
  const { data, error } = await db
    .from('region_prospects')
    .select('region_id, label, business_category, last_searched_at, businesses, prospects, without_site, social_only')
    .order('last_searched_at', { ascending: false });

  if (error) {
    throw new Error(`Não foi possível ler os varrimentos: ${error.message}`);
  }

  return (data ?? [])
    // A vista deixa as colunas nuláveis (é o que o gerador faz com qualquer
    // vista); uma linha sem id não serve para filtrar nada e não se mostra.
    .filter((row): row is typeof row & { region_id: string } => Boolean(row.region_id))
    .map((row) => {
      const slug = row.business_category ?? '';
      return {
        regionId: row.region_id,
        label: row.label ?? 'Sem nome',
        categorySlug: slug,
        // Um ramo que já não exista no mapa mostra-se pelo slug em vez de
        // desaparecer: o lote continua lá e continua a poder ser filtrado.
        categoryLabel: findCategory(slug)?.label ?? slug,
        lastSearchedAt: row.last_searched_at ?? '',
        businesses: row.businesses ?? 0,
        prospects: row.prospects ?? 0,
        withoutSite: row.without_site ?? 0,
        socialOnly: row.social_only ?? 0,
      };
    });
}
