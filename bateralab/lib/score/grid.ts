/**
 * Atalho para escrever partituras curtas em código (aulas, testes) com as
 * mesmas "linhas de grade" do catálogo (scripts/build-exercises.mjs):
 * um caractere por tick — x nota, X acento, g fantasma, - pausa.
 */
import type { DrumEvent, DrumMeasure, DrumPiece, DrumScore } from "./types";

const LANES: Record<string, DrumPiece> = {
  hh: "hihatClosed",
  ho: "hihatOpen",
  sn: "snare",
  bd: "kick",
  t1: "tom1",
  t2: "tom2",
  ft: "floorTom",
  cr: "crash",
  rd: "ride",
};
const VELOCITY: Record<string, number> = { x: 100, X: 125, g: 35 };

export type GridBar = Partial<Record<keyof typeof LANES | "st", string>>;

export function gridMeasure(bar: GridBar): DrumMeasure {
  const events: DrumEvent[] = [];
  for (const [lane, raw] of Object.entries(bar)) {
    if (lane === "st" || !raw) continue;
    [...raw.replace(/[\s|]/g, "")].forEach((c, tick) => {
      const velocity = VELOCITY[c];
      if (velocity) events.push({ tick, piece: LANES[lane]!, velocity });
    });
  }
  if (bar.st) {
    [...bar.st.replace(/[\s|]/g, "")].forEach((c, tick) => {
      if (c !== "R" && c !== "L") return;
      for (const e of events) if (e.tick === tick && e.piece !== "kick") e.sticking = c;
    });
  }
  return { events: events.sort((a, b) => a.tick - b.tick) };
}

export function gridScore(
  title: string,
  bars: (GridBar | DrumMeasure)[],
  options: Partial<Pick<DrumScore, "bpm" | "timeSignature" | "resolution">> = {},
): DrumScore {
  return {
    id: title,
    title,
    bpm: options.bpm ?? 80,
    timeSignature: options.timeSignature ?? [4, 4],
    resolution: options.resolution ?? 16,
    measures: bars.map((b) => ("events" in b ? (b as DrumMeasure) : gridMeasure(b as GridBar))),
  };
}

/** Notas com duração escrita explícita: [tick, duração em ticks]. */
export function sustained(piece: DrumPiece, notes: [number, number][]): DrumMeasure {
  return { events: notes.map(([tick, duration]) => ({ tick, piece, velocity: 100, duration })) };
}
