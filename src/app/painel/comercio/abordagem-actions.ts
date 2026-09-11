'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { listSites } from '@/lib/sites/repository';
import { publicEnv } from '@/lib/env';
import { DEFAULT_MODEL, isModelId } from '@/lib/ai/models';
import { gerarAbordagem } from '@/lib/ai/abordagem';
import { describeAiError } from '@/lib/ai/client';
import type { AiActionState } from '@/lib/ai/action-state';
import { guardarAbordagem } from '@/lib/outreach/repository';

/**
 * Escrever a mensagem de primeiro contacto de um comércio.
 *
 * Como nas outras ações pagas, a falha volta como valor e não por exceção: uma
 * chamada que se pagou e correu mal tem de dizer porquê no sítio onde a pessoa
 * está a olhar, em vez de a atirar para um ecrã de erro que a manda recomeçar.
 */
export async function escreverAbordagem(
  _anterior: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return { ok: false, message: 'Faltou o comércio.' };

  const modelo = String(formData.get('modelo') ?? '');
  const model = isModelId(modelo) ? modelo : DEFAULT_MODEL;
  const assinatura = String(formData.get('assinatura') ?? '');

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Sessão expirada. Entra outra vez.' };

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { ok: false, message: 'Comércio não encontrado.' };

  // A página no ar é o argumento mais forte que há: não pede nada e já mostra
  // trabalho feito. Só entra se estiver mesmo acessível — mandar um link
  // expirado é pior do que não mandar link nenhum.
  const sites = await listSites(supabase, businessId);
  const live = sites.find((s) => s.isLive);
  const urlPagina = live ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/s/${live.publicCode}` : null;

  try {
    const resultado = await gerarAbordagem(business, { urlPagina, assinatura }, model);

    await guardarAbordagem(supabase, businessId, resultado.mensagens, {
      model: resultado.model,
      inputTokens: resultado.usage.inputTokens,
      outputTokens: resultado.usage.outputTokens,
    });

    revalidatePath(`/painel/comercio/${businessId}`);

    return {
      ok: true,
      message: `${resultado.mensagens.length} mensagens escritas. Escolhe uma e envia.`,
    };
  } catch (cause) {
    const erro = describeAiError(cause);
    return { ok: false, message: erro.message, hint: erro.hint };
  }
}
