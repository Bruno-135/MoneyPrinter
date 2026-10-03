import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export interface Campanha {
  id: string;
  assunto: string;
  corpo: string;
  aprovadaEm: string | null;
  limiteDiario: number;
}

export interface Candidato {
  id: string;
  name: string;
  locality: string | null;
  country: string;
  email: string;
}

/** Quantos candidatos se mostram de uma vez, por muito que sobre do limite. */
export const MAXIMO_POR_ENVIO = 30;

function daLinha(r: Database['public']['Tables']['campanhas_email']['Row']): Campanha {
  return {
    id: r.id,
    assunto: r.assunto,
    corpo: r.corpo,
    aprovadaEm: r.aprovada_em,
    limiteDiario: r.limite_diario,
  };
}

export async function campanhaAtual(db: Db): Promise<Campanha | null> {
  const { data, error } = await db
    .from('campanhas_email')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? daLinha(data) : null;
}

/**
 * Guarda o texto. Se mudou alguma coisa, a aprovação cai: o que o dono aprovou
 * foi UM texto, e não se pode enviar outro com a licença do primeiro.
 */
export async function guardarTexto(
  db: Db,
  texto: { assunto: string; corpo: string },
): Promise<void> {
  const atual = await campanhaAtual(db);
  if (!atual) {
    const { error } = await db
      .from('campanhas_email')
      .insert({ nome: 'Primeiro contacto', assunto: texto.assunto, corpo: texto.corpo });
    if (error) throw new Error(error.message);
    return;
  }
  const mudou = atual.assunto !== texto.assunto || atual.corpo !== texto.corpo;
  const { error } = await db
    .from('campanhas_email')
    .update({
      assunto: texto.assunto,
      corpo: texto.corpo,
      ...(mudou ? { aprovada_em: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', atual.id);
  if (error) throw new Error(error.message);
}

/** Aprova EXACTAMENTE o texto que está guardado, e só se ainda for o mesmo. */
export async function aprovar(
  db: Db,
  id: string,
  assunto: string,
  corpo: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('campanhas_email')
    .update({ aprovada_em: new Date().toISOString() })
    .eq('id', id)
    .eq('assunto', assunto)
    .eq('corpo', corpo)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length === 1;
}

/** Janela móvel de 24 h: mais simples de explicar e mais estrita que «hoje». */
export async function enviadosNasUltimas24h(db: Db): Promise<number> {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await db
    .from('emails_enviados')
    .select('id', { count: 'exact', head: true })
    .gte('enviado_em', desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const COLUNAS = 'id, name, locality, country_code, email, score';

type LinhaDeCandidato = {
  id: string;
  name: string;
  locality: string | null;
  country_code: string;
  email: string | null;
};

function comoCandidato(r: LinhaDeCandidato): Candidato | null {
  return r.email
    ? { id: r.id, name: r.name, locality: r.locality, country: r.country_code, email: r.email }
    : null;
}

/**
 * A quem se pode escrever: tem e-mail, nunca foi contactado por nenhum canal
 * e não está na lista de não contactar (a vista `estado_do_contacto` já
 * exclui as duas últimas). Os de melhor nota primeiro.
 *
 * `servem` deixa de fora quem o texto não consegue preencher (sem cidade, por
 * exemplo), para a lista que se mostra ser a que de facto sairia.
 *
 * O mesmo endereço em dois leads (uma cadeia com várias lojas) conta uma vez.
 */
export async function candidatos(
  db: Db,
  quantos: number,
  servem: (c: Candidato) => boolean = () => true,
): Promise<Candidato[]> {
  if (quantos <= 0) return [];
  const { data, error } = await db
    .from('businesses_with_stage')
    .select(COLUNAS)
    .eq('estado_do_contacto', 'por_contactar')
    .eq('is_archived', false)
    .not('email', 'is', null)
    .order('score', { ascending: false })
    .limit(quantos * 4);
  if (error) throw new Error(error.message);

  const vistos = new Set<string>();
  const lista: Candidato[] = [];
  for (const r of data ?? []) {
    const c = comoCandidato(r as LinhaDeCandidato);
    if (!c || !servem(c)) continue;
    const chave = c.email.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push(c);
  }

  // Um endereço a que já se escreveu por OUTRO lead também fica de fora.
  if (lista.length > 0) {
    const { data: ja, error: e2 } = await db
      .from('emails_enviados')
      .select('para')
      .in(
        'para',
        lista.map((c) => c.email),
      );
    if (e2) throw new Error(e2.message);
    const enviados = new Set((ja ?? []).map((r) => r.para.toLowerCase()));
    return lista.filter((c) => !enviados.has(c.email.toLowerCase())).slice(0, quantos);
  }
  return lista.slice(0, quantos);
}

/** Os mesmos leads, relidos agora: o que se mostrou pode ter mudado entretanto. */
export async function candidatosPorId(db: Db, ids: string[]): Promise<Candidato[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from('businesses_with_stage')
    .select(COLUNAS)
    .in('id', ids)
    .eq('estado_do_contacto', 'por_contactar')
    .eq('is_archived', false)
    .not('email', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => {
    const c = comoCandidato(r as LinhaDeCandidato);
    return c ? [c] : [];
  });
}

export async function registarEnvio(
  db: Db,
  linha: {
    id: string;
    businessId: string;
    para: string;
    assunto: string;
    corpo: string;
    campanhaId: string;
  },
): Promise<void> {
  const { error } = await db.from('emails_enviados').insert({
    id: linha.id,
    business_id: linha.businessId,
    para: linha.para,
    assunto: linha.assunto,
    corpo: linha.corpo,
    campanha: linha.campanhaId,
    estado: 'a_enviar',
  });
  if (error) throw new Error(error.message);
}

export async function marcarEnviado(db: Db, id: string, resendId: string | null): Promise<void> {
  const { error } = await db
    .from('emails_enviados')
    .update({ estado: 'enviado', resend_id: resendId })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Um envio que falhou apaga-se. A vista conta qualquer linha de
 * `emails_enviados` como «e-mail enviado»; deixar lá uma que nunca saiu
 * escondia o lead da lista de por contactar.
 */
export async function esquecerEnvio(db: Db, id: string): Promise<void> {
  await db.from('emails_enviados').delete().eq('id', id);
}
