/**
 * Conversão DrumScore → linha do tempo do Tone.Transport (função pura, testável).
 *
 * Princípio da sincronia: tudo é posicionado em TICKS do Transport, nunca em
 * segundos. O Transport converte ticks em tempo de áudio usando o BPM atual,
 * por isso mudar o BPM durante a reprodução não desalinha nada — o som, a
 * partitura e o kit continuam presos à mesma grade.
 *
 * Layout da linha do tempo (M = ticks de um compasso):
 *
 *   slot 0      slot 1      slot 2            slot N
 *   [0, M)      [M, 2M)     [2M, 3M)    ...   [N·M, (N+1)·M)
 *   contagem    compasso 1  compasso 2        compasso N
 *
 * O compasso i da partitura vive no slot i+1. O slot imediatamente antes do
 * compasso onde a reprodução começa serve de contagem (count-in): se o loop
 * começa no compasso 3, a contagem acontece no slot 2 e as notas que lá
 * estariam (compasso 2) são silenciadas durante a contagem.
 */
import { type DrumEvent, type DrumScore, ticksPerBeat, ticksPerMeasure } from "@/lib/score";

/** Pulsos por semínima do Transport. 192 divide-se por 2, 3, 4, 8, 16, 32 e 64. */
export const TRANSPORT_PPQ = 192;

export interface TimelineStep {
  /** Índice do compasso na partitura (0-based). */
  measure: number;
  /** Tick dentro do compasso (unidades de `resolution`). */
  tick: number;
  /** Posição absoluta no Transport, em ticks. */
  transportTicks: number;
  /** Notas que soam neste instante (acordes: várias peças ao mesmo tempo). */
  notes: DrumEvent[];
}

export interface TimelineBeat {
  /** Slot (0 = contagem antes do compasso 1; s ≥ 1 = compasso s). */
  slot: number;
  /** Batida dentro do compasso (0-based). */
  beat: number;
  transportTicks: number;
}

export interface Timeline {
  steps: TimelineStep[];
  beats: TimelineBeat[];
  /** Ticks do Transport por compasso. */
  measureTicks: number;
  /** Ticks do Transport por batida. */
  beatTicks: number;
  /** Ticks do Transport por tick da partitura. */
  scoreTickTicks: number;
  measureCount: number;
}

export function buildTimeline(score: DrumScore, ppq = TRANSPORT_PPQ): Timeline {
  // Uma semibreve = 4 semínimas = 4·ppq ticks; a grade divide-a em `resolution`.
  const scoreTickTicks = (ppq * 4) / score.resolution;
  if (!Number.isInteger(scoreTickTicks)) {
    throw new Error(`resolution ${score.resolution} não cabe em PPQ ${ppq}`);
  }
  const measureTicks = ticksPerMeasure(score) * scoreTickTicks;
  const beatTicks = ticksPerBeat(score) * scoreTickTicks;
  const beatsPerMeasure = score.timeSignature[0];

  const steps: TimelineStep[] = [];
  score.measures.forEach((measure, mi) => {
    const byTick = new Map<number, DrumEvent[]>();
    for (const ev of measure.events) {
      const list = byTick.get(ev.tick) ?? [];
      list.push(ev);
      byTick.set(ev.tick, list);
    }
    [...byTick.keys()]
      .sort((a, b) => a - b)
      .forEach((tick) => {
        steps.push({
          measure: mi,
          tick,
          transportTicks: (mi + 1) * measureTicks + tick * scoreTickTicks,
          notes: byTick.get(tick)!,
        });
      });
  });

  const beats: TimelineBeat[] = [];
  for (let slot = 0; slot <= score.measures.length; slot++) {
    for (let beat = 0; beat < beatsPerMeasure; beat++) {
      beats.push({ slot, beat, transportTicks: slot * measureTicks + beat * beatTicks });
    }
  }

  return { steps, beats, measureTicks, beatTicks, scoreTickTicks, measureCount: score.measures.length };
}

/** Início (em ticks do Transport) do compasso `measure` (0-based). */
export function measureStartTicks(timeline: Timeline, measure: number): number {
  return (measure + 1) * timeline.measureTicks;
}

/** Converte ticks do Transport em segundos para um dado BPM (semínima = 1 batida de BPM). */
export function ticksToSeconds(ticks: number, bpm: number, ppq = TRANSPORT_PPQ): number {
  return (ticks / ppq) * (60 / bpm);
}
