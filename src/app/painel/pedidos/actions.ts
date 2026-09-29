'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import {
  apagarPedido,
  guardarNotas,
  mudarEstado,
  type EstadoDoPedido,
} from '@/lib/vaidesign/pedidos/repository';

const ESTADOS: readonly EstadoDoPedido[] = ['novo', 'respondido', 'ganho', 'perdido'];

function lerEstado(v: FormDataEntryValue | null): EstadoDoPedido {
  const texto = typeof v === 'string' ? v : '';
  if ((ESTADOS as readonly string[]).includes(texto)) return texto as EstadoDoPedido;
  throw new Error(`estado desconhecido: ${texto}`);
}

export async function marcarPedido(dados: FormData): Promise<void> {
  await exigirAcesso('pedidos');
  const id = String(dados.get('id') ?? '');
  const estado = lerEstado(dados.get('estado'));

  const db = await createClient();
  await mudarEstado(db, id, estado);
  revalidatePath('/painel/pedidos');
}

export async function anotarPedido(dados: FormData): Promise<void> {
  await exigirAcesso('pedidos');
  const id = String(dados.get('id') ?? '');
  const notas = String(dados.get('notas') ?? '');

  const db = await createClient();
  await guardarNotas(db, id, notas);
  revalidatePath('/painel/pedidos');
}

/**
 * Apaga um pedido.
 *
 * Não tem confirmação nenhuma aqui dentro — a confirmação é o ecrã, e é lá
 * que tem de estar: uma ação de servidor não pode perguntar nada a ninguém.
 */
export async function excluirPedido(dados: FormData): Promise<void> {
  await exigirAcesso('pedidos');
  const id = String(dados.get('id') ?? '');
  if (!id) throw new Error('falta o id do pedido a apagar');

  const db = await createClient();
  await apagarPedido(db, id);
  revalidatePath('/painel/pedidos');
}
