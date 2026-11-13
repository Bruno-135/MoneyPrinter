'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { ehUuid } from '@/lib/emails/uuid';
import { desfazerInstagram, registarInstagram } from '@/lib/instagram/contacto';

/**
 * A Lista de Instagram usa a mesma área de acesso que a de WhatsApp: são os
 * dois canais de mensagem, e quem pode mandar um pode mandar o outro.
 */

/** Chamado ao carregar no botão, ao mesmo tempo que a conversa abre. */
export async function marcarInstagram(businessId: string): Promise<void> {
  await exigirAcesso('whatsapp');
  if (!ehUuid(businessId)) return;
  const supabase = await createClient();
  await registarInstagram(supabase, businessId);
  revalidatePath('/painel/instagram');
  revalidatePath('/painel/whatsapp');
}

export async function anularInstagram(businessId: string): Promise<void> {
  await exigirAcesso('whatsapp');
  if (!ehUuid(businessId)) return;
  const supabase = await createClient();
  await desfazerInstagram(supabase, businessId);
  revalidatePath('/painel/instagram');
  revalidatePath('/painel/whatsapp');
}
