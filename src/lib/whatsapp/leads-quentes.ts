import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * O que a lista e a página de um lead quente leem: a conversa (estado,
 * etapa, notas), o negócio da base se houver, e o nome que o WhatsApp dá.
 */

export const COLUNAS_DO_LEAD =
  'numero, business_id, etapa, etapa_em, nome, notas, quente, quente_em, humano_desde, motivo, updated_at, ultima_entrada_em, teste';

/** Uma conversa entra em «Leads quentes» se for quente, se passou ao Bruno, ou se já tem etapa. */
export const FILTRO_DE_QUENTES = 'quente.eq.true,humano_desde.not.is.null,etapa.neq.novo';

export interface NegocioDoLead {
  id: string;
  name: string;
  business_category: string;
  locality: string | null;
}

export async function negociosPorId(db: Db, ids: string[]): Promise<Map<string, NegocioDoLead>> {
  if (ids.length === 0) return new Map();
  const { data } = await db
    .from('businesses')
    .select('id, name, business_category, locality')
    .in('id', ids);
  return new Map((data ?? []).map((b) => [b.id, b]));
}

/** O nome a mostrar: o escrito à mão, o da ficha, o do WhatsApp, ou o número. */
export function nomeDoLead(args: {
  nome: string | null;
  negocio?: NegocioDoLead;
  nomeWhatsapp?: string | null;
  numero: string;
}): string {
  return args.nome || args.negocio?.name || args.nomeWhatsapp || `+${args.numero}`;
}
