'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { publicEnv } from '@/lib/env';
import { emailDeAbordagem } from '@/lib/emails/abordagem';
import { enviarEmail, ligacoesParaSair } from '@/lib/emails/envio';
import {
  carregarLead,
  confirmarLinha,
  desfazerLinha,
  enviadosNoDia,
  gravarLinha,
  porQueNaoPode,
  registarEmail,
  saidaFunciona,
} from '@/lib/emails/abordagens';

export interface ResultadoDoBotao {
  ok: boolean;
  mensagem: string;
}

/**
 * Envia o e-mail de abordagem a UM lead, o mesmo que se está a ver no ecrã.
 *
 * Volta a ver tudo do lado do servidor antes de enviar — e-mail, lista de não
 * contactar, se já recebeu, limite do dia, se o link de sair funciona — porque
 * o ecrã pode estar aberto há meia hora e o que ele dizia já não ser verdade.
 */
export async function enviarAbordagem(businessId: string): Promise<ResultadoDoBotao> {
  await exigirAcesso('emails');
  const supabase = await createClient();

  const lead = await carregarLead(supabase, businessId);
  if (!lead) return { ok: false, mensagem: 'Este lead já não existe.' };

  const motivo = porQueNaoPode(lead, await enviadosNoDia(supabase));
  if (motivo) return { ok: false, mensagem: motivo };

  if (!(await saidaFunciona(supabase))) {
    return {
      ok: false,
      mensagem:
        'O link «não quero receber mais» ainda não funciona: falta correr a migração 0044 no Supabase. Nada foi enviado.',
    };
  }

  const id = crypto.randomUUID();
  const sair = ligacoesParaSair(publicEnv.NEXT_PUBLIC_SITE_URL, id);
  const montado = emailDeAbordagem({
    pais: lead.pais,
    ramo: lead.ramo,
    chave: lead.id,
    site: lead.site,
    base: publicEnv.NEXT_PUBLIC_SITE_URL,
    sair: sair.pagina,
  });

  await gravarLinha(supabase, {
    id,
    businessId: lead.id,
    para: lead.email!,
    assunto: montado.assunto,
    texto: montado.texto,
  });

  const resultado = await enviarEmail({ para: lead.email!, montado, umClique: sair.umClique });
  if (!resultado.ok) {
    await desfazerLinha(supabase, id);
    return {
      ok: false,
      mensagem: `A Resend recusou o envio (${resultado.erro}). Nada foi enviado.`,
    };
  }

  await confirmarLinha(supabase, id, resultado.id);
  await registarEmail(supabase, lead.id);
  revalidatePath('/painel/emails');
  revalidatePath(`/painel/emails/${lead.id}`);
  return { ok: true, mensagem: `E-mail enviado para ${lead.email}.` };
}
