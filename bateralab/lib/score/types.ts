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
  /** Intensidade MIDI, 1–127. */
  velocity: number;
}

export interface DrumMeasure {
  events: DrumEvent[];
}

export interface DrumScore {
  /** Identificador estável (slug). Nos exercícios é igual ao nome do arquivo. */
  id?: string;
  title: string;
  description?: string;
  bpm: number;
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

/** Número de ticks numa batida (tempo do metrônomo). Ex: 4/4 resolution 16 → 4. */
export function ticksPerBeat(score: Pick<DrumScore, "timeSignature" | "resolution">): number {
  return score.resolution / score.timeSignature[1];
}
