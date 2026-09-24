'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
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
  const id = String(dados.get('id') ?? '');
  const estado = lerEstado(dados.get('estado'));

  const db = await createClient();
  await mudarEstado(db, id, estado);
  revalidatePath('/painel/pedidos');
}

export async function anotarPedido(dados: FormData): Promise<void> {
  const id = String(dados.get('id') ?? '');
  const notas = String(dados.get('notas') ?? '');

  const db = await createClient();
  await guardarNotas(db, id, notas);
  revalidatePath('/painel/pedidos');
}
