'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  apagarPedido,
  criarPedido,
  fecharPedido,
  reabrirPedido,
} from '@/lib/suporte/repository';

/**
 * As acções da caixa de suporte.
 *
 * Todas revalidam `/painel` além do próprio ecrã: o número de pedidos
 * atrasados está no painel, e um pedido fechado que continuasse a contar lá
 * seria a forma mais rápida de deixar de acreditar no painel.
 */

export interface EstadoDoPedido {
  erro: string | null;
  feito: boolean;
}

function refrescar(businessId?: string) {
  revalidatePath('/painel/suporte');
  revalidatePath('/painel');
  if (businessId) revalidatePath(`/painel/comercio/${businessId}`);
}

export async function novoPedido(
  _anterior: EstadoDoPedido,
  form: FormData,
): Promise<EstadoDoPedido> {
  const businessId = String(form.get('businessId') ?? '');
  const titulo = String(form.get('titulo') ?? '').trim();
  const prazo = Number(form.get('prazo') ?? 2);

  if (!businessId) return { erro: 'Escolhe o cliente.', feito: false };
  if (titulo.length < 3) return { erro: 'Escreve o que ele pediu.', feito: false };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erro: 'A sessão expirou. Entra outra vez.', feito: false };

  try {
    await criarPedido(supabase, {
      businessId,
      titulo,
      detalhes: String(form.get('detalhes') ?? ''),
      servicoSlug: String(form.get('servico') ?? '') || null,
      origem: String(form.get('origem') ?? 'whatsapp'),
      prazoEmDias: Number.isFinite(prazo) ? prazo : 2,
    });
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Não foi possível criar o pedido.', feito: false };
  }

  refrescar(businessId);
  return { erro: null, feito: true };
}

export async function marcarFeito(form: FormData): Promise<void> {
  const supabase = await createClient();
  await fecharPedido(supabase, String(form.get('id') ?? ''));
  refrescar(String(form.get('businessId') ?? '') || undefined);
}

export async function voltarAAbrir(form: FormData): Promise<void> {
  const supabase = await createClient();
  await reabrirPedido(supabase, String(form.get('id') ?? ''));
  refrescar(String(form.get('businessId') ?? '') || undefined);
}

export async function apagar(form: FormData): Promise<void> {
  const supabase = await createClient();
  await apagarPedido(supabase, String(form.get('id') ?? ''));
  refrescar(String(form.get('businessId') ?? '') || undefined);
}
