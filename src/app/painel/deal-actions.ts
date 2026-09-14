'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { setStage, setDealFields, registarVenda, anularVenda } from '@/lib/deals/repository';
import { lerValor, moedaDoPais } from '@/lib/deals/dinheiro';
import { isValidStage } from '@/lib/deals/stages';

/** Ações do funil. Correm com a sessão do utilizador, portanto a RLS aplica-se. */

async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/entrar');
  return supabase;
}

export async function changeStage(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  const stage = String(formData.get('stage') ?? '');

  if (!businessId || !isValidStage(stage)) return;

  await setStage(supabase, businessId, stage);

  revalidatePath('/painel');
  revalidatePath(`/painel/comercio/${businessId}`);
}

export async function saveNotes(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return;

  await setDealFields(supabase, businessId, {
    notes: String(formData.get('notes') ?? ''),
    nextAction: String(formData.get('nextAction') ?? ''),
    nextActionAt: String(formData.get('nextActionAt') ?? '') || null,
  });

  revalidatePath(`/painel/comercio/${businessId}`);
}

/**
 * Fecha a venda.
 *
 * O valor vem escrito por uma pessoa que está a fechar negócio — "30", "30,00",
 * "R$ 1.500,00" — e é lido com tolerância (ver `dinheiro.ts`). Não ter escrito
 * valor nenhum NÃO impede o registo: a venda aconteceu à mesma, e recusá-la por
 * falta de um número seria perder o facto mais importante por causa do detalhe.
 */
export async function marcarVenda(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return;

  // A moeda sai do país do comércio e não de uma caixa a mais no formulário:
  // uma padaria em Curitiba não recebe euros, e perguntá-lo seria perguntar o
  // que já se sabe.
  const { data: business } = await supabase
    .from('businesses')
    .select('country_code')
    .eq('id', businessId)
    .maybeSingle();

  await registarVenda(supabase, businessId, {
    valorCentimos: lerValor(String(formData.get('valor') ?? '')),
    mensal: formData.get('mensal') === 'on',
    moeda: moedaDoPais(business?.country_code ?? 'PT'),
  });

  revalidatePath('/painel');
  revalidatePath(`/painel/comercio/${businessId}`);
}

/** Desfaz o registo. O estado do funil fica como está — só o valor sai. */
export async function desmarcarVenda(formData: FormData): Promise<void> {
  const supabase = await requireSession();

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return;

  await anularVenda(supabase, businessId);

  revalidatePath('/painel');
  revalidatePath(`/painel/comercio/${businessId}`);
}
