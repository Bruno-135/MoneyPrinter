import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PedidoLido } from './campos';

type Db = SupabaseClient<Database>;

export type EstadoDoPedido = 'novo' | 'respondido' | 'ganho' | 'perdido';

export interface Pedido {
  id: string;
  negocio: string;
  contacto: string;
  pedido: string;
  modelo: string | null;
  prazo: string | null;
  estado: EstadoDoPedido;
  notas: string | null;
  criadoEm: string;
}

type Linha = Database['public']['Tables']['pedidos']['Row'];

function montar(linha: Linha): Pedido {
  return {
    id: linha.id,
    negocio: linha.negocio,
    contacto: linha.contacto,
    pedido: linha.pedido,
    modelo: linha.modelo,
    prazo: linha.prazo,
    estado: linha.estado as EstadoDoPedido,
    notas: linha.notas,
    criadoEm: linha.created_at,
  };
}

/**
 * Grava um pedido vindo do site.
 *
 * Passa por `registar_pedido` e não por um `insert`, porque quem preenche o
 * formulário não tem sessão e a tabela não está aberta a anónimos. A função
 * resolve o dono, corta os textos ao tamanho e escreve — e é a única coisa
 * que um anónimo pode fazer nesta tabela.
 */
export async function registarPedido(db: Db, valores: PedidoLido): Promise<string> {
  const { data, error } = await db.rpc('registar_pedido', {
    p_negocio: valores.negocio,
    p_contacto: valores.contacto,
    p_pedido: valores.pedido,
    p_modelo: valores.modelo || null,
    p_prazo: valores.prazo || null,
  });

  if (error) throw new Error(`Não foi possível gravar o pedido: ${error.message}`);
  return data as string;
}

/** Os pedidos do dono, os mais recentes primeiro. */
export async function pedidos(db: Db, estado?: EstadoDoPedido): Promise<Pedido[]> {
  let consulta = db.from('pedidos').select('*').order('created_at', { ascending: false });
  if (estado) consulta = consulta.eq('estado', estado);

  const { data, error } = await consulta;
  if (error) throw new Error(`Não foi possível ler os pedidos: ${error.message}`);
  return (data ?? []).map(montar);
}

/** Quantos pedidos por estado, para o painel saber o que mostrar em destaque. */
export async function contarPorEstado(db: Db): Promise<Record<EstadoDoPedido, number>> {
  const conta: Record<EstadoDoPedido, number> = {
    novo: 0,
    respondido: 0,
    ganho: 0,
    perdido: 0,
  };

  const { data, error } = await db.from('pedidos').select('estado');
  if (error) throw new Error(`Não foi possível contar os pedidos: ${error.message}`);

  for (const linha of data ?? []) {
    const estado = linha.estado as EstadoDoPedido;
    if (estado in conta) conta[estado] += 1;
  }
  return conta;
}

export async function mudarEstado(
  db: Db,
  id: string,
  estado: EstadoDoPedido,
): Promise<void> {
  const { error } = await db.from('pedidos').update({ estado }).eq('id', id);
  if (error) throw new Error(`Não foi possível mudar o estado: ${error.message}`);
}

export async function guardarNotas(db: Db, id: string, notas: string): Promise<void> {
  const { error } = await db
    .from('pedidos')
    .update({ notas: notas.trim() || null })
    .eq('id', id);
  if (error) throw new Error(`Não foi possível guardar as notas: ${error.message}`);
}
