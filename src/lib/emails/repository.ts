import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { aplicarEstadoDoEmail } from './filtro';
import {
  ESTADOS_DO_EMAIL,
  ORIGEM_NAO_ABRIU,
  estadoDoEmail,
  type EstadoDoEmail,
} from './estado-do-email';

type Db = SupabaseClient<Database>;

export type Contagens = Record<EstadoDoEmail, number> & { total: number };

export interface PorVer {
  id: string;
  site: string;
}

/** Quantos leads há em cada estado do e-mail. Os arquivados não contam. */
export async function contagens(db: Db): Promise<Contagens> {
  const base = () =>
    db.from('businesses').select('id', { count: 'exact', head: true }).eq('is_archived', false);

  const [total, ...porEstado] = await Promise.all([
    base(),
    ...ESTADOS_DO_EMAIL.map((e) => aplicarEstadoDoEmail(base(), e)),
  ]);
  for (const r of [total, ...porEstado]) if (r.error) throw new Error(r.error.message);

  const c = { total: total.count ?? 0 } as Contagens;
  ESTADOS_DO_EMAIL.forEach((e, i) => {
    c[e] = porEstado[i]!.count ?? 0;
  });
  return c;
}

/**
 * Os próximos sites a ver: os «não extraídos». É aqui que entram os leads
 * novos — um lead acabado de prospetar não tem e-mail nem data de visita, por
 * isso cai neste filtro sem que nada o tenha de pôr lá. Os de melhor nota
 * primeiro.
 */
export async function proximosPorVer(db: Db, quantos: number): Promise<PorVer[]> {
  const { data, error } = await aplicarEstadoDoEmail(
    db.from('businesses').select('id, website_url').eq('is_archived', false),
    'nao_extraido',
  )
    .not('website_url', 'is', null)
    .order('score', { ascending: false })
    .limit(quantos);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => (r.website_url ? [{ id: r.id, site: r.website_url }] : []));
}

/**
 * Grava o que se achou, e SEMPRE com a data: é o que tira o lead do filtro
 * «não extraído». Sem isso, um site sem e-mail voltava em todos os lotes.
 *
 * Três resultados, três marcas: achou (`site`), abriu mas não tem (sem
 * origem), não abriu (`nao-abriu`, para se poder voltar a tentar).
 */
export async function gravarAchado(
  db: Db,
  id: string,
  achado: { email: string | null; abriu: boolean },
): Promise<void> {
  const { error } = await db
    .from('businesses')
    .update({
      email: achado.email,
      email_origem: achado.email ? 'site' : achado.abriu ? null : ORIGEM_NAO_ABRIU,
      email_visto_em: new Date().toISOString(),
    })
    .eq('id', id)
    // Um e-mail posto à mão nunca é substituído por um achado do site.
    .is('email', null);
  if (error) throw new Error(error.message);
}

/** Põe de novo em «não extraído» os sites que não abriram. Devolve quantos. */
export async function voltarAVer(db: Db): Promise<number> {
  const { data, error } = await aplicarEstadoDoEmail(
    db
      .from('businesses')
      .update({ email_visto_em: null, email_origem: null })
      .eq('is_archived', false),
    'nao_abriu',
  ).select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export interface LinhaDaFolha {
  id: string;
  nome: string;
  cidade: string | null;
  pais: string;
  site: string | null;
  email: string | null;
  origem: string | null;
  vistoEm: string | null;
  adicionadoEm: string | null;
  estado: EstadoDoEmail;
}

export type OrdemDaFolha = 'novos' | 'nome';

export interface PedidoDaFolha {
  estado: EstadoDoEmail | null;
  procura: string;
  ordem: OrdemDaFolha;
  de: number;
  quantos: number;
}

/** Tira o que tem significado num padrão `ilike` ou num filtro `or`. */
function limparProcura(texto: string): string {
  return texto
    .replace(/[%_\\,()*]/g, ' ')
    .trim()
    .slice(0, 80);
}

export async function folha(
  db: Db,
  pedido: PedidoDaFolha,
): Promise<{ linhas: LinhaDaFolha[]; total: number }> {
  let q = db
    .from('businesses')
    .select(
      'id, name, locality, country_code, website_url, website_kind, email, email_origem, email_visto_em, first_seen_at',
      { count: 'exact' },
    )
    .eq('is_archived', false);

  if (pedido.estado) q = aplicarEstadoDoEmail(q, pedido.estado);
  const procura = limparProcura(pedido.procura);
  if (procura) q = q.or(`name.ilike.%${procura}%,email.ilike.%${procura}%`);

  q =
    pedido.ordem === 'nome'
      ? q.order('name', { ascending: true })
      : q.order('first_seen_at', { ascending: false, nullsFirst: false }).order('name');

  const { data, count, error } = await q.range(pedido.de, pedido.de + pedido.quantos - 1);
  if (error) throw new Error(error.message);

  return {
    total: count ?? 0,
    linhas: (data ?? []).map((r) => ({
      id: r.id,
      nome: r.name,
      cidade: r.locality,
      pais: r.country_code,
      site: r.website_url,
      email: r.email,
      origem: r.email_origem,
      vistoEm: r.email_visto_em,
      adicionadoEm: r.first_seen_at,
      estado: estadoDoEmail(r),
    })),
  };
}
