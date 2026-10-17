/**
 * Formato central de partitura do BateraLab.
 *
 * Tudo no app (áudio, partitura VexFlow, kit SVG, exercícios em JSON e,
 * no futuro, a transcrição automática a partir de MIDI) fala este formato.
 */

/** Peças do kit. Os nomes são fixos: são chaves de JSON, de samples e de mapas MIDI. */
export const DRUM_PIECES = [
  "kick",
  "snare",
  "hihatClosed",
  "hihatOpen",
  "tom1",
  "tom2",
  "floorTom",
  "crash",
  "ride",
] as const;

export type DrumPiece = (typeof DRUM_PIECES)[number];

export interface DrumEvent {
  /**
   * Posição dentro do compasso, em unidades de `resolution`.
   * Com resolution 16 em 4/4: 0 = tempo 1, 4 = tempo 2, 2 = "e" do 1, etc.
   */
  tick: number;
  piece: DrumPiece;
  /**
   * Intensidade MIDI, 1–127. Na partitura: ≥ 118 (e acima da média) = acento;
   * ≤ 45 = nota fantasma (entre parênteses).
   */
  velocity: number;
  /** Mão indicada (rudimentos/viradas): aparece por baixo da nota. */
  sticking?: "R" | "L";
  /**
   * Duração escrita, em ticks (só afeta a partitura; bateria não sustenta).
   * Usada nas aulas para mostrar semibreve, mínima etc. Sem ela, cada nota
   * dura até a próxima dentro do tempo.
   */
  duration?: number;
}

export interface DrumMeasure {
  events: DrumEvent[];
}

export const LEVELS = ["iniciante", "intermediario", "avancado"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/** Tipos de exercício, na ordem em que aparecem dentro de cada nível. */
export const CATEGORIES = ["leitura", "rudimento", "coordenacao", "groove", "virada"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  leitura: "Leitura",
  rudimento: "Técnica e rudimentos",
  coordenacao: "Coordenação",
  groove: "Ritmos",
  virada: "Viradas",
};

export interface DrumScore {
  /** Identificador estável (slug). Nos exercícios é igual ao nome do arquivo. */
  id?: string;
  title: string;
  description?: string;
  /** Metadados da escola (opcionais para partituras avulsas/importadas). */
  level?: Level;
  category?: Category;
  /** Estilo musical, ex: "Rock", "Samba", "Funk". */
  style?: string;
  /** Dicas de estudo mostradas na tela do exercício. */
  tips?: string[];
  /** Andamento-alvo sugerido (o `bpm` é o andamento inicial). */
  goalBpm?: number;
  /**
   * Andamento inicial em BATIDAS por minuto: semínimas em 2/4, 3/4, 4/4, 5/4;
   * semínimas pontuadas em 6/8, 9/8 e 12/8 (o mesmo que o metrônomo conta).
   */
  bpm: number;
  /** Ordem dentro do catálogo (menor primeiro). */
  order?: number;
  /** [batidas por compasso, figura da batida], ex: [4, 4]. */
  timeSignature: [number, number];
  /**
   * Subdivisão da grade, como figura de nota: 16 = semicolcheia, 8 = colcheia,
   * 32 = fusa. Precisa ser potência de 2 (quiálteras ficam para uma etapa futura).
   */
  resolution: number;
  measures: DrumMeasure[];
}

export function isDrumPiece(value: unknown): value is DrumPiece {
  return typeof value === "string" && (DRUM_PIECES as readonly string[]).includes(value);
}

/** Número de ticks num compasso. Ex: 4/4 com resolution 16 → 16 ticks. */
export function ticksPerMeasure(score: Pick<DrumScore, "timeSignature" | "resolution">): number {
  const [beats, beatUnit] = score.timeSignature;
  return (score.resolution * beats) / beatUnit;
}

/** Compasso composto (6/8, 9/8, 12/8): a batida é a semínima pontuada. */
export function isCompound(timeSignature: [number, number]): boolean {
  const [beats, unit] = timeSignature;
  return unit >= 8 && beats >= 6 && beats % 3 === 0;
}

/**
 * Número de ticks numa batida (tempo do metrônomo e agrupamento de colchetes).
 * Ex: 4/4 resolution 16 → 4; 12/8 resolution 16 → 6 (semínima pontuada).
 */
export function ticksPerBeat(score: Pick<DrumScore, "timeSignature" | "resolution">): number {
  const unitTicks = score.resolution / score.timeSignature[1];
  return isCompound(score.timeSignature) ? unitTicks * 3 : unitTicks;
}

/** Duração de uma batida em semínimas (1 em 4/4, 1,5 em 12/8). */
export function quartersPerBeat(score: Pick<DrumScore, "timeSignature" | "resolution">): number {
  return (ticksPerBeat(score) * 4) / score.resolution;
}

/** Batidas por compasso (12/8 → 4, 6/8 → 2, 4/4 → 4). */
export function beatsPerMeasure(score: Pick<DrumScore, "timeSignature" | "resolution">): number {
  return ticksPerMeasure(score) / ticksPerBeat(score);
}
