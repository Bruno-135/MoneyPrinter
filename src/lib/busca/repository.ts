import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { prepararTermo } from './termo';

type Db = SupabaseClient<Database>;

export interface Achado {
  id: string;
  nome: string;
  codigo: string | null;
  ramo: string;
  localidade: string | null;
  pais: string;
  telefone: string | null;
  score: number;
  temSite: boolean | null;
  arquivado: boolean;
}

/** Quantos resultados se mostram. Mais do que isto ninguém lê. */
export const LIMITE = 40;

/**
 * Procurar um comércio pelo nome, pela localidade, pelo telefone ou pela
 * referência do cliente.
 *
 * Tudo isto bate contra `procura_texto`, a coluna gerada da 0030 — uma só
 * condição em vez de seis `or`, e com índice de trigramas por trás. Um `or`
 * sobre seis colunas obrigava a base de dados a varrer a tabela toda em cada
 * letra escrita.
 *
 * Devolve lista vazia, e não erro, quando o termo é curto de mais: quem está a
 * escrever ainda não acabou, e um erro vermelho à segunda letra é hostil.
 */
export async function procurar(db: Db, termo: string): Promise<Achado[]> {
  const preparado = prepararTermo(termo);
  if (!preparado) return [];

  const { data, error } = await db
    .from('businesses')
    .select(
      'id, name, client_code, business_category, locality, country_code, phone_e164, phone_raw, score, has_website, is_archived',
    )
    .like('procura_texto', `%${preparado}%`)
    // Os arquivados vão no fim e não fora: quem procura um nome específico
    // quer encontrá-lo mesmo que o tenha posto de lado, senão volta a procurar
    // três vezes convencido de que se enganou a escrever.
    .order('is_archived', { ascending: true })
    .order('score', { ascending: false })
    .limit(LIMITE);

  if (error) throw new Error(`Não foi possível procurar: ${error.message}`);

  return (data ?? []).map((b) => ({
    id: b.id,
    nome: b.name,
    codigo: b.client_code,
    ramo: b.business_category,
    localidade: b.locality,
    pais: b.country_code,
    telefone: b.phone_e164 ?? b.phone_raw ?? null,
    score: b.score,
    temSite: b.has_website,
    arquivado: b.is_archived,
  }));
}
