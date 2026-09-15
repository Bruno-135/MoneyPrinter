import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DealStage } from './stages';
import { DIAS_PARA_VOLTAR_A_TENTAR, type Desfecho } from './desfechos';

/**
 * Leitura e escrita das negociações.
 *
 * Uma decisão que atravessa este ficheiro: um comércio SEM linha em `deals`
 * conta como "por contactar". As linhas só nascem quando o utilizador mexe
 * pela primeira vez no estado. Criar 111 negociações vazias no momento do
 * varrimento encheria a tabela de ruído e faria o histórico começar com uma
 * mudança que nunca aconteceu.
 *
 * O histórico não se escreve daqui. É um trigger na base de dados que o grava,
 * a cada mudança de estado. Ver a migração 0005.
 */

type Db = SupabaseClient<Database>;

export interface DealState {
  id: string;
  stage: DealStage;
  stageChangedAt: string;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  lostReason: string | null;
  currency: string;
  wonAt: string | null;
}

export interface StageEvent {
  fromStage: DealStage | null;
  toStage: DealStage;
  changedAt: string;
}

/** Muda o estado, criando a negociação se ainda não existir. */
export async function setStage(db: Db, businessId: string, stage: DealStage): Promise<void> {
  const { data: existing, error: readError } = await db
    .from('deals')
    .select('id, stage')
    .eq('business_id', businessId)
    .maybeSingle();

  if (readError) throw new Error(`Não foi possível ler a negociação: ${readError.message}`);

  if (!existing) {
    // Insere já com o estado final, em vez de criar em 'new' e mudar a seguir:
    // assim o histórico regista uma entrada e não duas, e a primeira não é uma
    // mudança fictícia.
    const { error } = await db.from('deals').insert({ business_id: businessId, stage });
    if (error) throw new Error(`Não foi possível criar a negociação: ${error.message}`);
    return;
  }

  if (existing.stage === stage) return;

  const { error } = await db.from('deals').update({ stage }).eq('id', existing.id);
  if (error) throw new Error(`Não foi possível mudar o estado: ${error.message}`);
}

/** Notas e próximo passo. Não mexe no estado nem no histórico. */
export async function setDealFields(
  db: Db,
  businessId: string,
  fields: { notes?: string | null; nextAction?: string | null; nextActionAt?: string | null },
): Promise<void> {
  const payload = {
    ...(fields.notes !== undefined ? { notes: fields.notes || null } : {}),
    ...(fields.nextAction !== undefined ? { next_action: fields.nextAction || null } : {}),
    ...(fields.nextActionAt !== undefined ? { next_action_at: fields.nextActionAt || null } : {}),
  };
  if (Object.keys(payload).length === 0) return;

  const { data: existing } = await db
    .from('deals')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!existing) {
    const { error } = await db.from('deals').insert({ business_id: businessId, ...payload });
    if (error) throw new Error(`Não foi possível guardar as notas: ${error.message}`);
    return;
  }

  const { error } = await db.from('deals').update(payload).eq('id', existing.id);
  if (error) throw new Error(`Não foi possível guardar as notas: ${error.message}`);
}

export async function getDeal(db: Db, businessId: string): Promise<DealState | null> {
  const { data } = await db
    .from('deals')
    .select('id, stage, stage_changed_at, notes, next_action, next_action_at, lost_reason, currency, won_at')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    stage: data.stage,
    stageChangedAt: data.stage_changed_at,
    notes: data.notes,
    nextAction: data.next_action,
    nextActionAt: data.next_action_at,
    lostReason: data.lost_reason,
    currency: data.currency,
    wonAt: data.won_at,
  };
}

/** Histórico, do mais recente para o mais antigo. */
export async function getStageHistory(db: Db, businessId: string): Promise<StageEvent[]> {
  const { data } = await db
    .from('deal_stage_events')
    .select('from_stage, to_stage, changed_at')
    .eq('business_id', businessId)
    .order('changed_at', { ascending: false });

  return (data ?? []).map((row) => ({
    fromStage: row.from_stage,
    toStage: row.to_stage,
    changedAt: row.changed_at,
  }));
}

/** Quantos comércios em cada estado. Alimenta os filtros do painel. */

/**
 * O desfecho de um contacto da fila.
 *
 * Três, e a diferença entre eles é toda a razão de a fila existir:
 *
 *   contactado    falou-se. Sai da fila e entra no funil.
 *   adiado        não atendeu. CONTINUA por contactar — só não é hoje. Fica
 *                 com data de novo contacto e a fila ignora-o até lá.
 *   nao_interessa disse que não. Perdido, com a razão guardada.
 *
 * O do meio é o que se costuma fazer mal. Deixá-lo "por contactar" sem data
 * devolve-o à cabeça da fila daí a um minuto; marcá-lo como perdido deita fora
 * um prospeto que só não estava na loja. Nenhuma das duas é verdade, e a data
 * é.
 */
export async function registarDesfecho(
  db: Db,
  businessId: string,
  desfecho: Desfecho,
  opcoes: { adiarDias?: number; razao?: string } = {},
): Promise<void> {
  const agora = new Date();

  const campos =
    desfecho === 'contactado'
      ? {
          stage: 'contacted' as DealStage,
          last_contacted_at: agora.toISOString(),
          next_action_at: null,
        }
      : desfecho === 'adiado'
        ? {
            // O estado NÃO muda: continua por contactar.
            next_action: 'Voltar a tentar — não atendeu.',
            next_action_at: new Date(
              agora.getTime() + (opcoes.adiarDias ?? DIAS_PARA_VOLTAR_A_TENTAR) * 86_400_000,
            ).toISOString(),
            last_contacted_at: agora.toISOString(),
          }
        : {
            stage: 'lost' as DealStage,
            lost_reason: opcoes.razao?.trim() || 'Disse que não tem interesse.',
            next_action_at: null,
          };

  const { data: existing, error: readError } = await db
    .from('deals')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle();

  if (readError) throw new Error(`Não foi possível ler a negociação: ${readError.message}`);

  const { error } = existing
    ? await db.from('deals').update(campos).eq('id', existing.id)
    : await db.from('deals').insert({ business_id: businessId, ...campos });

  if (error) throw new Error(`Não foi possível registar o contacto: ${error.message}`);
}
