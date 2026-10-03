import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export interface PorVer {
  id: string;
  site: string;
}

export interface Contagens {
  /** Leads com site próprio: os únicos onde se vai procurar. */
  comSite: number;
  /** Já se foi ver o site (achou-se ou não). */
  vistos: number;
  /** Destes, os que tinham e-mail. */
  comEmail: number;
  /** Faltam ver. */
  porVer: number;
}

async function contar(
  db: Db,
  filtrar: (q: ReturnType<typeof base>) => ReturnType<typeof base>,
): Promise<number> {
  const { count, error } = await filtrar(base(db));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function base(db: Db) {
  return db
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('website_kind', 'real')
    .eq('is_archived', false);
}

export async function contagens(db: Db): Promise<Contagens> {
  const [comSite, vistos, comEmail] = await Promise.all([
    contar(db, (q) => q),
    contar(db, (q) => q.not('email_visto_em', 'is', null)),
    contar(db, (q) => q.not('email', 'is', null)),
  ]);
  return { comSite, vistos, comEmail, porVer: comSite - vistos };
}

/** Os próximos sites a ver, os de melhor nota primeiro. */
export async function proximosPorVer(db: Db, quantos: number): Promise<PorVer[]> {
  const { data, error } = await db
    .from('businesses')
    .select('id, website_url')
    .eq('website_kind', 'real')
    .eq('is_archived', false)
    .is('email_visto_em', null)
    .not('website_url', 'is', null)
    .order('score', { ascending: false })
    .limit(quantos);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => (r.website_url ? [{ id: r.id, site: r.website_url }] : []));
}

/**
 * Grava o que se achou. `email = null` também se grava, com a data: é o que
 * impede de voltar a abrir, em cada lote, os mesmos sites que não têm nada.
 */
export async function gravarAchado(db: Db, id: string, email: string | null): Promise<void> {
  const { error } = await db
    .from('businesses')
    .update({
      email,
      email_origem: email ? 'site' : null,
      email_visto_em: new Date().toISOString(),
    })
    .eq('id', id)
    // Um e-mail posto à mão nunca é substituído por um achado do site.
    .is('email', null);
  if (error) throw new Error(error.message);
}
