'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { setStage, setDealFields } from '@/lib/deals/repository';
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
