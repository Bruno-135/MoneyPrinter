import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * O que o comerciante fez com a página que lhe mandaste.
 *
 * As visitas e os cliques já eram registados desde o princípio e nunca foram
 * mostrados em lado nenhum. É a informação mais valiosa que este sistema tem e
 * estava a apodrecer numa tabela: saber que alguém abriu a proposta — e ainda
 * por cima carregou no WhatsApp — é o melhor momento que há para pegar no
 * telefone. Passadas vinte e quatro horas vale metade.
 */

type Db = SupabaseClient<Database>;
type Alvo = Database['public']['Enums']['click_target'];

/** O que cada clique quer dizer, dito como se diria a uma pessoa. */
export const O_QUE_FEZ: Record<Alvo, string> = {
  whatsapp: 'carregou no WhatsApp',
  phone: 'carregou no telefone',
  email: 'carregou no email',
  directions: 'pediu a direção',
  menu_item: 'abriu o cardápio',
  social: 'foi à rede social',
  external_link: 'seguiu uma ligação',
  other: 'mexeu na página',
};

export interface Atividade {
  visitas: number;
  ultimaVisita: string | null;
  /** Cliques por tipo, do mais frequente para o menos. */
  cliques: { alvo: Alvo; quantos: number }[];
  ultimoClique: string | null;
}

export async function atividadeDoComercio(db: Db, businessId: string): Promise<Atividade | null> {
  const [{ data: visitas, count }, { data: cliques }] = await Promise.all([
    db
      .from('site_visits')
      .select('visited_at', { count: 'exact' })
      .eq('business_id', businessId)
      .order('visited_at', { ascending: false })
      .limit(1),
    db
      .from('site_clicks')
      .select('target, clicked_at')
      .eq('business_id', businessId)
      .order('clicked_at', { ascending: false })
      .limit(200),
  ]);

  const total = count ?? 0;
  const listaCliques = cliques ?? [];

  // Sem visita nenhuma não há nada a dizer, e uma caixa a dizer "0 visitas"
  // seria ruído numa ficha que já tem muito que ler.
  if (total === 0 && listaCliques.length === 0) return null;

  const porAlvo = new Map<Alvo, number>();
  for (const c of listaCliques) porAlvo.set(c.target, (porAlvo.get(c.target) ?? 0) + 1);

  return {
    visitas: total,
    ultimaVisita: visitas?.[0]?.visited_at ?? null,
    cliques: [...porAlvo.entries()]
      .map(([alvo, quantos]) => ({ alvo, quantos }))
      .sort((a, b) => b.quantos - a.quantos),
    ultimoClique: listaCliques[0]?.clicked_at ?? null,
  };
}

export interface AbriuAPagina {
  businessId: string;
  nome: string;
  quando: string;
  /** O clique mais forte que deu, se deu algum. */
  fez: Alvo | null;
}

/**
 * Quem abriu a página nos últimos dias.
 *
 * Para o painel. Um comerciante que abriu a proposta há duas horas é a melhor
 * chamada do dia, e sem isto à vista nunca se sabia que ela existia.
 *
 * Os cliques que mais valem vêm primeiro na ordem de interesse: quem carregou
 * no WhatsApp ou no telefone está a um passo de falar contigo; quem só abriu,
 * abriu.
 */
const INTERESSE: Alvo[] = ['whatsapp', 'phone', 'email', 'directions', 'menu_item'];

export async function abriramAPagina(
  db: Db,
  opcoes: { dias?: number; limite?: number } = {},
): Promise<AbriuAPagina[]> {
  const { dias = 7, limite = 5 } = opcoes;
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();

  const { data: visitas } = await db
    .from('site_visits')
    .select('business_id, visited_at, businesses(name)')
    .gte('visited_at', desde)
    .not('business_id', 'is', null)
    .order('visited_at', { ascending: false })
    .limit(200);

  if (!visitas || visitas.length === 0) return [];

  // Uma linha por comércio, com a visita mais recente. O mesmo comerciante a
  // abrir a página cinco vezes é uma boa notícia, não cinco.
  const porComercio = new Map<string, AbriuAPagina>();
  for (const v of visitas) {
    const id = v.business_id;
    if (!id || porComercio.has(id)) continue;
    const negocio = v.businesses as { name: string } | null;
    porComercio.set(id, {
      businessId: id,
      nome: negocio?.name ?? 'Comércio',
      quando: v.visited_at,
      fez: null,
    });
  }

  const ids = [...porComercio.keys()].slice(0, limite);
  if (ids.length === 0) return [];

  const { data: cliques } = await db
    .from('site_clicks')
    .select('business_id, target')
    .in('business_id', ids)
    .gte('clicked_at', desde);

  for (const c of cliques ?? []) {
    if (!c.business_id) continue;
    const linha = porComercio.get(c.business_id);
    if (!linha) continue;
    const atual = linha.fez === null ? Infinity : INTERESSE.indexOf(linha.fez);
    const novo = INTERESSE.indexOf(c.target);
    if (novo !== -1 && novo < atual) linha.fez = c.target;
  }

  return ids.map((id) => porComercio.get(id)!);
}
