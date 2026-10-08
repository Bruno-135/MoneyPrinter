'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { desfazerWhatsapp, registarWhatsapp } from '@/lib/whatsapp/contacto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chamado ao carregar no botão, ao mesmo tempo que o WhatsApp abre. */
export async function marcarWhatsapp(businessId: string): Promise<void> {
  await exigirAcesso('whatsapp');
  if (!UUID.test(businessId)) return;
  const supabase = await createClient();
  await registarWhatsapp(supabase, businessId);
  revalidatePath('/painel/whatsapp');
}

export async function anularWhatsapp(businessId: string): Promise<void> {
  await exigirAcesso('whatsapp');
  if (!UUID.test(businessId)) return;
  const supabase = await createClient();
  await desfazerWhatsapp(supabase, businessId);
  revalidatePath('/painel/whatsapp');
}
