import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * Quem pode receber o e-mail de abordagem, e o que fica gravado quando sai.
 *
 * As regras, por ordem:
 *   - tem e-mail;
 *   - não está na lista de não contactar (pediu para sair, ou marcou-se à mão);
 *   - ainda não recebeu nenhum e-mail nosso — um e-mail de abordagem é UM;
 *   - não se passou do limite do dia. Um domínio novo que manda cem e-mails
 *     no primeiro dia vai parar ao spam de toda a gente, os bons incluídos.
 *
 * Nada aqui envia sozinho: o envio é um botão, um lead de cada vez, e só
 * depois de se ver o e-mail tal como vai sair.
 */

export const CAMPANHA = 'abordagem-site';
export const LIMITE_POR_DIA = 30;
export const DIAS_PARA_ESPERAR_RESPOSTA = 5;
export const NOTA_DA_ESPERA = 'E-mail enviado — à espera de resposta.';

export interface LeadDoEmail {
  id: string;
  nome: string;
  email: string | null;
  site: string | null;
  pais: string;
  ramo: string | null;
  estado: string | null;
  emailadoEm: string | null;
}

export async function carregarLead(db: Db, id: string): Promise<LeadDoEmail | null> {
  const { data, error } = await db
    .from('businesses_with_stage')
    .select(
      'id, name, email, website_url, country_code, business_category, estado_do_contacto, emailado_em',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return {
    id: data.id,
    nome: data.name ?? '',
    email: data.email,
    site: data.website_url,
    pais: data.country_code ?? 'PT',
    ramo: data.business_category,
    estado: data.estado_do_contacto,
    emailadoEm: data.emailado_em,
  };
}

/** Quantos e-mails de abordagem saíram nas últimas 24 horas. */
export async function enviadosNoDia(db: Db, agora = new Date()): Promise<number> {
  const desde = new Date(agora.getTime() - 86_400_000).toISOString();
  const { count, error } = await db
    .from('emails_enviados')
    .select('id', { count: 'exact', head: true })
    .eq('campanha', CAMPANHA)
    .gte('enviado_em', desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Porque é que este lead NÃO pode receber o e-mail agora; null se pode. */
export function porQueNaoPode(lead: LeadDoEmail, enviadosHoje: number): string | null {
  if (!lead.email) return 'Este lead não tem e-mail.';
  if (lead.estado === 'nao_contactar') return 'Está na lista de não contactar.';
  if (lead.emailadoEm) return 'Já recebeu um e-mail nosso.';
  if (enviadosHoje >= LIMITE_POR_DIA)
    return `Já saíram ${LIMITE_POR_DIA} e-mails nas últimas 24 horas. Volte amanhã: mandar mais de uma vez estraga a entrega de todos.`;
  return null;
}

/**
 * A linha vai ANTES do envio, com o id que já está no link de sair: se a
 * pessoa carregar em sair, a linha tem de existir. Se o envio falhar, apaga-se
 * (`desfazerLinha`) — a vista conta qualquer linha como e-mail enviado.
 */
export async function gravarLinha(
  db: Db,
  linha: { id: string; businessId: string; para: string; assunto: string; texto: string },
): Promise<void> {
  const { error } = await db.from('emails_enviados').insert({
    id: linha.id,
    business_id: linha.businessId,
    para: linha.para,
    assunto: linha.assunto,
    corpo: linha.texto,
    campanha: CAMPANHA,
    estado: 'a-enviar',
  });
  if (error) throw new Error(`Não foi possível gravar o e-mail: ${error.message}`);
}

export async function confirmarLinha(db: Db, id: string, resendId: string | null) {
  await db.from('emails_enviados').update({ estado: 'enviado', resend_id: resendId }).eq('id', id);
}

export async function desfazerLinha(db: Db, id: string) {
  await db.from('emails_enviados').delete().eq('id', id);
}

/**
 * Como no WhatsApp: um contacto pelo canal `email` e uma próxima acção daqui a
 * uns dias, sem mexer na etapa do funil.
 */
export async function registarEmail(db: Db, businessId: string, agora = new Date()) {
  const { error } = await db
    .from('contact_events')
    .insert({ business_id: businessId, outcome: 'contactado', channel: 'email' });
  if (error) console.error('E-mail enviado, mas o contacto não ficou:', error.message);

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
  if (e2) console.error('E-mail enviado, mas a espera não ficou:', e2.message);
}

/**
 * Confirma que a função de sair (migração 0044) está na base de dados. Sem
 * ela, o link de «não quero receber mais» não fazia nada — e mandar um e-mail
 * com um link de sair que não funciona é pior do que não mandar.
 */
export async function saidaFunciona(db: Db): Promise<boolean> {
  const { error } = await db.rpc('cancelar_subscricao', {
    p_id: '00000000-0000-0000-0000-000000000000',
  });
  return !error;
}
