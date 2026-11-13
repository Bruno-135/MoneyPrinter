import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * O que fica gravado quando se carrega no Instagram da lista — o mesmo que no
 * WhatsApp (ver `whatsapp/contacto.ts`), com o canal `instagram`.
 *
 * `contact_events.channel` é texto livre, por isso não foi preciso mexer na
 * base. Na vista `businesses_with_stage`, um lead só com Instagram fica em
 * «contactado» (o estado conhece WhatsApp e e-mail pelo nome; os outros canais
 * contam como contacto); o «Instagram enviado» lê-se direto dos contactos, em
 * `instagramEnviados`.
 */

export const DIAS_PARA_ESPERAR_RESPOSTA = 3;
export const NOTA_DA_ESPERA = 'Instagram enviado — à espera de resposta.';

export async function registarInstagram(db: Db, businessId: string, agora = new Date()) {
  const { error } = await db
    .from('contact_events')
    .insert({ business_id: businessId, outcome: 'contactado', channel: 'instagram' });
  if (error) throw new Error(`Não foi possível registar o Instagram: ${error.message}`);

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
  if (e2) console.error('Instagram registado, mas a espera não ficou:', e2.message);
}

/** Desfaz um toque por engano nas últimas 24 h, como no WhatsApp. */
export async function desfazerInstagram(db: Db, businessId: string, agora = new Date()) {
  const desde = new Date(agora.getTime() - 86_400_000).toISOString();
  const { error } = await db
    .from('contact_events')
    .delete()
    .eq('business_id', businessId)
    .eq('channel', 'instagram')
    .gte('created_at', desde);
  if (error) throw new Error(`Não foi possível desfazer: ${error.message}`);

  await db
    .from('deals')
    .update({ next_action: null, next_action_at: null })
    .eq('business_id', businessId)
    .eq('next_action', NOTA_DA_ESPERA);
}

/** Quando cada lead recebeu a última mensagem pelo Instagram (id → data). */
export async function instagramEnviados(db: Db): Promise<Map<string, string>> {
  const porLead = new Map<string, string>();
  for (let de = 0; de < 50_000; de += 1000) {
    const { data, error } = await db
      .from('contact_events')
      .select('business_id, created_at')
      .eq('channel', 'instagram')
      .order('id')
      .range(de, de + 999);
    if (error) throw new Error(`Não foi possível ler os contactos do Instagram: ${error.message}`);
    for (const c of data ?? []) {
      const antes = porLead.get(c.business_id);
      if (!antes || c.created_at > antes) porLead.set(c.business_id, c.created_at);
    }
    if ((data ?? []).length < 1000) break;
  }
  return porLead;
}
