'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ehUuid } from '@/lib/emails/uuid';

/**
 * Pública de propósito: quem a chama é um destinatário, sem conta nenhuma.
 * O que o protege é o identificador, que só existe dentro do e-mail recebido.
 */
export async function cancelarSubscricao(form: FormData): Promise<void> {
  const id = String(form.get('id') ?? '');
  if (!ehUuid(id)) redirect('/cancelar/invalido');
  const supabase = await createClient();
  await supabase.rpc('cancelar_subscricao', { p_id: id });
  redirect(`/cancelar/${id}?feito=1`);
}
