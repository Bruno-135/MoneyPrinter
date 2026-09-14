import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DealStage } from './stages';

/**
 * O que está marcado para hoje.
 *
 * O campo "próximo passo · quando" existia na ficha desde o princípio e não
 * aparecia em lado nenhum: escrevia-se lá "voltar a ligar na quinta" e a
 * quinta-feira passava sem ninguém ser avisado. Um lembrete que não lembra é
 * pior do que nenhum, porque dá a sensação de estar tratado.
 *
 * Entra aqui o que está marcado para hoje OU já passou. O atrasado não
 * desaparece: um seguimento esquecido há três dias é mais urgente do que um de
 * hoje, não menos.
 */

type Db = SupabaseClient<Database>;

export interface ParaHoje {
  businessId: string;
  nome: string;
  phone: string | null;
  stage: DealStage;
  /** O que estava combinado fazer. */
  passo: string | null;
  quando: string;
  /** Dias de atraso. Zero quando é mesmo para hoje. */
  atraso: number;
}

export async function paraHoje(db: Db, limite = 12): Promise<ParaHoje[]> {
  // Até ao fim do dia de hoje: um seguimento marcado para as 18h é para hoje
  // de manhã também, senão só aparecia depois da hora — e a essa hora já não
  // se liga a ninguém.
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  // Lê-se de `deals` e não da vista dos comércios: a vista não traz o texto do
  // próximo passo, e um item de agenda É uma negociação — o comércio é que
  // vem agarrado, e não o contrário.
  const { data, error } = await db
    .from('deals')
    .select('next_action, next_action_at, stage, businesses(id, name, phone_e164, phone_raw, is_archived)')
    .not('next_action_at', 'is', null)
    .lte('next_action_at', fimDoDia.toISOString())
    // Um negócio fechado — ganho ou perdido — não tem seguimento a fazer,
    // mesmo que tenha ficado com data marcada de antes.
    .not('stage', 'in', '("won","lost")')
    .order('next_action_at', { ascending: true })
    .limit(limite);

  if (error) throw new Error(`Não foi possível ler a agenda: ${error.message}`);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (data ?? [])
    .flatMap((d) => {
      const comercio = d.businesses as {
        id: string;
        name: string;
        phone_e164: string | null;
        phone_raw: string | null;
        is_archived: boolean;
      } | null;

      // Arquivado não tem seguimento. O filtro não cabe na consulta porque
      // está do outro lado da junção.
      if (!comercio || comercio.is_archived) return [];

      const dia = new Date(d.next_action_at!);
      dia.setHours(0, 0, 0, 0);
      const atraso = Math.max(0, Math.round((hoje.getTime() - dia.getTime()) / 86_400_000));

      return [
        {
          businessId: comercio.id,
          nome: comercio.name,
          phone: comercio.phone_e164 ?? comercio.phone_raw ?? null,
          stage: d.stage,
          passo: d.next_action,
          quando: d.next_action_at!,
          atraso,
        },
      ];
    });
}
