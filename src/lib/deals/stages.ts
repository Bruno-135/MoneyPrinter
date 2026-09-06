import type { Database } from '@/types/database.types';

/**
 * Os estados da negociação, em português e por ordem de funil.
 *
 * A ordem aqui é a ordem em que as coisas acontecem, e é ela que manda na
 * apresentação: nos menus, nas listas e nos filtros. Os desfechos (ganho,
 * perdido, em pausa) aparecem no fim porque saem do funil, não avançam nele.
 */

export type DealStage = Database['public']['Enums']['deal_stage'];

export interface StageDefinition {
  value: DealStage;
  label: string;
  /** Ajuda a perceber o que significa, sem ter de adivinhar. */
  hint: string;
  /** true para estados que ainda estão em jogo. */
  open: boolean;
}

export const STAGES: readonly StageDefinition[] = [
  { value: 'new', label: 'Por contactar', hint: 'Saiu da busca, ainda ninguém falou com ele.', open: true },
  { value: 'contacted', label: 'Contactado', hint: 'Já houve um primeiro contacto.', open: true },
  { value: 'meeting_scheduled', label: 'Reunião marcada', hint: 'Há data combinada.', open: true },
  { value: 'proposal_sent', label: 'Proposta enviada', hint: 'Já viu a landing page ou o PDF.', open: true },
  { value: 'negotiating', label: 'Em negociação', hint: 'A discutir preço ou âmbito.', open: true },
  { value: 'won', label: 'Ganho', hint: 'Fechou negócio. Sai do funil de trabalho.', open: false },
  { value: 'lost', label: 'Perdido', hint: 'Não avançou. Podes reabrir se mudar de ideias.', open: false },
  { value: 'on_hold', label: 'Em pausa', hint: 'Adiado por decisão do comércio.', open: false },
] as const;

const BY_VALUE = new Map(STAGES.map((s) => [s.value, s]));

export function stageLabel(stage: DealStage | null | undefined): string {
  return BY_VALUE.get(stage ?? 'new')?.label ?? 'Por contactar';
}

export function stageDefinition(stage: DealStage | null | undefined): StageDefinition {
  return BY_VALUE.get(stage ?? 'new') ?? STAGES[0]!;
}

export function isValidStage(value: string): value is DealStage {
  return BY_VALUE.has(value as DealStage);
}

/** Estados ainda em jogo. Usado no filtro "por trabalhar". */
export function openStages(): DealStage[] {
  return STAGES.filter((s) => s.open).map((s) => s.value);
}

/**
 * Classes de cor por estado.
 *
 * Ganho e perdido são os dois desfechos e têm de se distinguir num relance;
 * os estados intermédios sobem de intensidade à medida que avançam no funil,
 * para a lista se ler pela cor antes de se ler pelo texto.
 */
export const STAGE_STYLE: Record<DealStage, string> = {
  new: 'bg-black/[0.06] text-black/60 dark:bg-white/10 dark:text-white/60',
  contacted: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  meeting_scheduled: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  proposal_sent: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  negotiating: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
  won: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
  lost: 'bg-red-500/15 text-red-700 dark:text-red-300',
  on_hold: 'bg-black/[0.06] text-black/45 dark:bg-white/[0.07] dark:text-white/45',
};
