/**
 * DrumScore → estrutura de notação (independente do VexFlow, testável).
 *
 * Convenção de escrita usada (a mais comum em métodos de bateria):
 *  - Duas vozes: mãos com hastes para cima, pé (bumbo) com hastes para baixo.
 *  - Pratos e chimbal com cabeça em "x"; chimbal aberto com "o" por cima.
 *  - Cada batida é preenchida em separado (notas + pausas), o que dá
 *    agrupamentos de colchete por tempo, fáceis de ler.
 */
import { type DrumEvent, type DrumPiece, type DrumScore, ticksPerBeat, ticksPerMeasure } from "./types";

/** Posição na pauta (clave de percussão, posições como na clave de sol) e cabeça. */
export const PIECE_NOTATION: Record<DrumPiece, { key: string; head: "normal" | "x"; voice: "hands" | "feet" }> = {
  crash: { key: "a/5", head: "x", voice: "hands" },
  hihatClosed: { key: "g/5", head: "x", voice: "hands" },
  hihatOpen: { key: "g/5", head: "x", voice: "hands" },
  ride: { key: "f/5", head: "x", voice: "hands" },
  tom1: { key: "e/5", head: "normal", voice: "hands" },
  tom2: { key: "d/5", head: "normal", voice: "hands" },
  snare: { key: "c/5", head: "normal", voice: "hands" },
  floorTom: { key: "a/4", head: "normal", voice: "hands" },
  kick: { key: "f/4", head: "normal", voice: "feet" },
};

export interface NotationItem {
  /** Tick (unidades de resolution) onde começa. */
  tick: number;
  /** Duração VexFlow sem pontos: "1", "2", "4", "8", "16", "32", "64". */
  duration: string;
  dots: number;
  rest: boolean;
  /** Teclas VexFlow, ex: ["g/5/x", "c/5"]. Para pausas, a posição da pausa. */
  keys: string[];
  pieces: DrumPiece[];
  /** Chimbal aberto neste acorde → desenhar "o". */
  open: boolean;
  /** Acento (velocity alta e acima da média da voz). */
  accent: boolean;
}

export interface MeasureNotation {
  hands: NotationItem[];
  feet: NotationItem[];
}

const REST_KEY = { hands: "e/5", feet: "e/4" } as const;

/**
 * Divide `ticks` em figuras representáveis (com ponto, se couber) para uma
 * grade `resolution`. Ex (resolution 16): 4 → [4], 3 → [8.], 5 → [4, 16].
 */
export function splitDuration(ticks: number, resolution: number): { duration: string; dots: number; ticks: number }[] {
  const parts: { duration: string; dots: number; ticks: number }[] = [];
  let left = ticks;
  while (left > 0) {
    // maior figura simples (potência de 2) que cabe
    let unit = 1;
    while (unit * 2 <= left && unit * 2 <= resolution) unit *= 2;
    const dotted = unit + unit / 2;
    if (unit >= 2 && dotted <= left && Number.isInteger(unit / 2)) {
      parts.push({ duration: String(resolution / unit), dots: 1, ticks: dotted });
      left -= dotted;
    } else {
      parts.push({ duration: String(resolution / unit), dots: 0, ticks: unit });
      left -= unit;
    }
  }
  return parts;
}

function voiceItems(
  events: DrumEvent[],
  voice: "hands" | "feet",
  score: Pick<DrumScore, "timeSignature" | "resolution">,
): NotationItem[] {
  const measureLen = ticksPerMeasure(score);
  const beatLen = ticksPerBeat(score);
  const restKey = REST_KEY[voice];
  const items: NotationItem[] = [];

  if (events.length === 0) {
    // Compasso vazio nesta voz → pausa de compasso inteiro.
    return [{ tick: 0, duration: "1", dots: 0, rest: true, keys: [restKey], pieces: [], open: false, accent: false }];
  }

  const byTick = new Map<number, DrumEvent[]>();
  for (const e of events) byTick.set(e.tick, [...(byTick.get(e.tick) ?? []), e]);
  const onsets = [...byTick.keys()].sort((a, b) => a - b);
  const avgVelocity = events.reduce((s, e) => s + e.velocity, 0) / events.length;

  const pushRest = (from: number, len: number) => {
    let t = from;
    for (const p of splitDuration(len, score.resolution)) {
      items.push({ tick: t, ...p, rest: true, keys: [restKey], pieces: [], open: false, accent: false });
      t += p.ticks;
    }
  };

  for (let beatStart = 0; beatStart < measureLen; beatStart += beatLen) {
    const beatEnd = beatStart + beatLen;
    const inBeat = onsets.filter((t) => t >= beatStart && t < beatEnd);
    let cursor = beatStart;
    inBeat.forEach((tick, i) => {
      if (tick > cursor) pushRest(cursor, tick - cursor);
      const next = inBeat[i + 1] ?? beatEnd;
      const chord = byTick.get(tick)!;
      const pieces = [...new Set(chord.map((e) => e.piece))];
      // hihatClosed + hihatOpen no mesmo tick compartilham a linha: fica uma cabeça.
      const keys = [...new Set(pieces.map((p) => `${PIECE_NOTATION[p].key}${PIECE_NOTATION[p].head === "x" ? "/x" : ""}`))];
      const maxVelocity = Math.max(...chord.map((e) => e.velocity));
      const [first, ...rest] = splitDuration(next - tick, score.resolution);
      items.push({
        tick,
        ...first!,
        rest: false,
        keys,
        pieces,
        open: pieces.includes("hihatOpen"),
        accent: maxVelocity >= 118 && maxVelocity > avgVelocity + 10,
      });
      // Se a duração não couber numa só figura, o resto vira pausa.
      let t = tick + first!.ticks;
      for (const p of rest) {
        items.push({ tick: t, ...p, rest: true, keys: [restKey], pieces: [], open: false, accent: false });
        t += p.ticks;
      }
      cursor = next;
    });
    if (inBeat.length === 0) pushRest(beatStart, beatLen);
  }
  return items;
}

export function measureToNotation(
  measure: DrumScore["measures"][number],
  score: Pick<DrumScore, "timeSignature" | "resolution">,
): MeasureNotation {
  const hands = measure.events.filter((e) => PIECE_NOTATION[e.piece].voice === "hands");
  const feet = measure.events.filter((e) => PIECE_NOTATION[e.piece].voice === "feet");
  return { hands: voiceItems(hands, "hands", score), feet: voiceItems(feet, "feet", score) };
}
