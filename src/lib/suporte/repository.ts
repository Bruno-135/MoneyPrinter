import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { limiteEmDias, porUrgencia } from './prazos';

type Db = SupabaseClient<Database>;

export interface Pedido {
  id: string;
  businessId: string;
  nomeDoCliente: string;
  localidade: string | null;
  telefone: string | null;
  titulo: string;
  detalhes: string | null;
  servicoSlug: string | null;
  origem: string;
  due_at: string;
  closed_at: string | null;
  criadoEm: string;
}

/** As colunas, num sítio só: repetidas em dois `select` divergem com o tempo. */
const COLUNAS =
  'id, business_id, title, details, service_slug, origin, due_at, closed_at, created_at, businesses(name, locality, phone_e164, phone_raw)';

interface Linha {
  id: string;
  business_id: string;
  title: string;
  details: string | null;
  service_slug: string | null;
  origin: string;
  due_at: string;
  closed_at: string | null;
  created_at: string;
  businesses: {
    name: string;
    locality: string | null;
    phone_e164: string | null;
    phone_raw: string | null;
  } | null;
}

function paraPedido(linha: Linha): Pedido | null {
  const negocio = linha.businesses;
  if (!negocio) return null;

  return {
    id: linha.id,
    businessId: linha.business_id,
    nomeDoCliente: negocio.name,
    localidade: negocio.locality,
    telefone: negocio.phone_e164 ?? negocio.phone_raw ?? null,
    titulo: linha.title,
    detalhes: linha.details,
    servicoSlug: linha.service_slug,
    origem: linha.origin,
    due_at: linha.due_at,
    closed_at: linha.closed_at,
    criadoEm: linha.created_at,
  };
}

/**
 * A caixa de entrada: tudo o que está aberto, mais o que se fechou há pouco.
 *
 * Os fechados recentes ficam à vista de propósito. Sem eles, fechar um pedido
 * fá-lo desaparecer e não há como desfazer um engano — nem como ver o trabalho
 * do dia, que é metade da razão para ter isto.
 */
export async function caixaDeEntrada(db: Db, diasDeHistorico = 14): Promise<Pedido[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasDeHistorico);

  const { data, error } = await db
    .from('support_requests')
    .select(COLUNAS)
    .or(`closed_at.is.null,closed_at.gte.${desde.toISOString()}`)
    .order('due_at', { ascending: true })
    .limit(500);

  if (error) throw new Error(`Não foi possível ler os pedidos: ${error.message}`);

  const pedidos = (data as unknown as Linha[]).map(paraPedido).filter((p): p is Pedido => p !== null);
  return porUrgencia(pedidos);
}

/** Os pedidos de um cliente, para a ficha dele. */
export async function pedidosDoCliente(db: Db, businessId: string): Promise<Pedido[]> {
  const { data, error } = await db
    .from('support_requests')
    .select(COLUNAS)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`Não foi possível ler os pedidos: ${error.message}`);

  const pedidos = (data as unknown as Linha[]).map(paraPedido).filter((p): p is Pedido => p !== null);
  return porUrgencia(pedidos);
}

export interface Contagens {
  abertos: number;
  atrasados: number;
  /** Fechados dentro do prazo este mês, e quantos se fecharam ao todo. */
  noPrazoEsteMes: number;
  fechadosEsteMes: number;
}

/**
 * As contagens para o painel.
 *
 * Contadas em SQL e não em JavaScript: o PostgREST corta as respostas às mil
 * linhas por omissão, e uma contagem feita sobre uma lista cortada dá um número
 * que parece bom e está errado — sem dar erro nenhum.
 */
export async function contagens(db: Db, agora: Date = new Date()): Promise<Contagens> {
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const fimDeHoje = limiteEmDias(0, agora).toISOString();

  const [abertos, atrasados, fechados] = await Promise.all([
    db.from('support_requests').select('*', { count: 'exact', head: true }).is('closed_at', null),
    db
      .from('support_requests')
      .select('*', { count: 'exact', head: true })
      .is('closed_at', null)
      .lt('due_at', fimDeHoje),
    db
      .from('support_requests')
      .select('due_at, closed_at')
      .not('closed_at', 'is', null)
      .gte('closed_at', inicioDoMes)
      .limit(1000),
  ]);

  const doMes = fechados.data ?? [];
  // No prazo pelo DIA e não pela hora: prometer quinta e entregar quinta às 18h
  // é ter cumprido, mesmo que o prazo tenha sido criado às 9h da manhã.
  const noPrazo = doMes.filter((p) => {
    const limite = new Date(p.due_at);
    limite.setHours(23, 59, 59, 999);
    return new Date(p.closed_at!) <= limite;
  }).length;

  return {
    abertos: abertos.count ?? 0,
    // "Atrasado" no painel inclui o que é para hoje: é o que precisa de atenção
    // hoje, que é a pergunta que o painel faz.
    atrasados: atrasados.count ?? 0,
    noPrazoEsteMes: noPrazo,
    fechadosEsteMes: doMes.length,
  };
}

export async function criarPedido(
  db: Db,
  dados: {
    businessId: string;
    titulo: string;
    detalhes?: string;
    servicoSlug?: string | null;
    origem?: string;
    prazoEmDias: number;
  },
): Promise<void> {
  const { error } = await db.from('support_requests').insert({
    business_id: dados.businessId,
    title: dados.titulo.trim(),
    details: dados.detalhes?.trim() || null,
    service_slug: dados.servicoSlug || null,
    origin: dados.origem || 'whatsapp',
    due_at: limiteEmDias(dados.prazoEmDias).toISOString(),
  });

  if (error) throw new Error(`Não foi possível criar o pedido: ${error.message}`);
}

export async function fecharPedido(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('support_requests')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Não foi possível fechar o pedido: ${error.message}`);
}

/** Reabrir mantém o prazo original: foi esse o que se prometeu ao cliente. */
export async function reabrirPedido(db: Db, id: string): Promise<void> {
  const { error } = await db.from('support_requests').update({ closed_at: null }).eq('id', id);

  if (error) throw new Error(`Não foi possível reabrir o pedido: ${error.message}`);
}

export async function apagarPedido(db: Db, id: string): Promise<void> {
  const { error } = await db.from('support_requests').delete().eq('id', id);

  if (error) throw new Error(`Não foi possível apagar o pedido: ${error.message}`);
}
