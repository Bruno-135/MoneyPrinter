import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * O que fica gravado quando se carrega no WhatsApp da lista.
 *
 * Duas coisas, e cada uma tem a sua razão:
 *
 *   1. Um contacto pelo canal `whatsapp` — é o que põe o lead em «WhatsApp
 *      enviado» em todo o painel. Prova que a conversa foi ABERTA com a
 *      mensagem escrita; carregar em enviar é no WhatsApp, e isso daqui não se vê.
 *   2. Uma próxima acção daqui a três dias, sem mexer na etapa do funil. Uma
 *      mensagem a um desconhecido ainda não é uma conversa; mas sem esta data a
 *      fila «Leads a contactar» punha-o à frente no dia seguinte e ligava-se a
 *      quem acabou de receber uma mensagem.
 */

export const DIAS_PARA_ESPERAR_RESPOSTA = 3;
export const NOTA_DA_ESPERA = 'WhatsApp enviado — à espera de resposta.';

export async function registarWhatsapp(db: Db, businessId: string, agora = new Date()) {
  const { error } = await db
    .from('contact_events')
    .insert({ business_id: businessId, outcome: 'contactado', channel: 'whatsapp' });
  if (error) throw new Error(`Não foi possível registar o WhatsApp: ${error.message}`);

  const campos = {
    next_action: NOTA_DA_ESPERA,
    next_action_at: new Date(
      agora.getTime() + DIAS_PARA_ESPERAR_RESPOSTA * 86_400_000,
    ).toISOString(),
    last_contacted_at: agora.toISOString(),
  };
  const { data: existente } = await db
    .from('deals')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle();
  const { error: e2 } = existente
    ? await db.from('deals').update(campos).eq('id', existente.id)
    : await db.from('deals').insert({ business_id: businessId, ...campos });
  // O contacto já ficou gravado, que é o que o ecrã mostra; perder a espera
  // não vale rebentar a lista a meio de uma sessão.
  if (e2) console.error('WhatsApp registado, mas a espera não ficou:', e2.message);
}

/**
 * Desfaz um toque por engano: apaga os WhatsApp das últimas 24 h deste lead e
 * tira a espera, se a espera ainda for a que a lista pôs. Uma próxima acção
 * escrita à mão entretanto fica onde está.
 */
export async function desfazerWhatsapp(db: Db, businessId: string, agora = new Date()) {
  const desde = new Date(agora.getTime() - 86_400_000).toISOString();
  const { error } = await db
    .from('contact_events')
    .delete()
    .eq('business_id', businessId)
    .eq('channel', 'whatsapp')
    .gte('created_at', desde);
  if (error) throw new Error(`Não foi possível desfazer: ${error.message}`);

  await db
    .from('deals')
    .update({ next_action: null, next_action_at: null })
    .eq('business_id', businessId)
    .eq('next_action', NOTA_DA_ESPERA);
}
