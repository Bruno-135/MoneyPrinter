import type { DealStage } from '@/lib/deals/stages';

/**
 * As etapas de um lead quente do WhatsApp, pela ordem em que acontecem, e o
 * estado do funil a que cada uma corresponde quando o lead é da base. «Novo»
 * não mexe no funil: o robô já o marcou e a fila «Leads a contactar» já o tem.
 */

export const ETAPAS_DO_LEAD = [
  { value: 'novo', label: 'Novo', dica: 'O robô marcou como quente, ainda ninguém pegou.' },
  { value: 'em_andamento', label: 'Em andamento', dica: 'Já está a falar com ele.' },
  { value: 'negociando', label: 'Negociando', dica: 'A discutir preço ou o que leva.' },
  { value: 'fechado', label: 'Fechado', dica: 'Comprou.' },
  { value: 'recusado', label: 'Recusado', dica: 'Não avançou.' },
] as const;

export type EtapaDoLead = (typeof ETAPAS_DO_LEAD)[number]['value'];

export function ehEtapaDoLead(v: unknown): v is EtapaDoLead {
  return ETAPAS_DO_LEAD.some((e) => e.value === v);
}

export const ETAPA_PARA_FUNIL: Record<EtapaDoLead, DealStage | null> = {
  novo: null,
  em_andamento: 'contacted',
  negociando: 'negotiating',
  fechado: 'won',
  recusado: 'lost',
};

export const ESTILO_DA_ETAPA: Record<EtapaDoLead, string> = {
  novo: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  em_andamento: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  negociando: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
  fechado: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
  recusado: 'bg-red-500/15 text-red-700 dark:text-red-300',
};
