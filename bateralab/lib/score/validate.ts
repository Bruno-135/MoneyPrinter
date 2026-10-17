import { CATEGORIES, type Category, type DrumEvent, type DrumPiece, type DrumScore, isDrumPiece, type Level, LEVELS, ticksPerMeasure } from "./types";

const isPowerOfTwo = (n: number) => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/**
 * Valida um objeto desconhecido (ex: JSON de exercício) e devolve um DrumScore
 * normalizado (eventos ordenados por tick). Lança Error com mensagem legível.
 */
export function parseScore(input: unknown, source = "partitura"): DrumScore {
  const fail = (msg: string): never => {
    throw new Error(`${source}: ${msg}`);
  };
  if (typeof input !== "object" || input === null) fail("não é um objeto");
  const raw = input as Record<string, unknown>;

  if (typeof raw.title !== "string" || !raw.title) fail("title em falta");
  if (typeof raw.bpm !== "number" || raw.bpm < 20 || raw.bpm > 300) fail("bpm inválido");
  const ts = raw.timeSignature as number[];
  if (
    !Array.isArray(ts) ||
    ts.length !== 2 ||
    !Number.isInteger(ts[0]) ||
    ts[0]! < 1 ||
    !isPowerOfTwo(ts[1]!)
  ) {
    fail("timeSignature inválido (ex: [4, 4])");
  }
  if (!isPowerOfTwo(raw.resolution as number)) fail("resolution precisa ser potência de 2 (ex: 16)");
  if (!Array.isArray(raw.measures) || raw.measures.length === 0) fail("measures vazio");

  const score: DrumScore = {
    id: typeof raw.id === "string" ? raw.id : undefined,
    title: raw.title as string,
    description: typeof raw.description === "string" ? raw.description : undefined,
    style: typeof raw.style === "string" ? raw.style : undefined,
    goalBpm: typeof raw.goalBpm === "number" ? raw.goalBpm : undefined,
    order: typeof raw.order === "number" ? raw.order : undefined,
    bpm: raw.bpm as number,
    timeSignature: [ts[0]!, ts[1]!],
    resolution: raw.resolution as number,
    measures: [],
  };
  if (raw.level !== undefined) {
    if (!(LEVELS as readonly unknown[]).includes(raw.level)) fail(`level inválido (${LEVELS.join(", ")})`);
    score.level = raw.level as Level;
  }
  if (raw.category !== undefined) {
    if (!(CATEGORIES as readonly unknown[]).includes(raw.category)) fail(`category inválida (${CATEGORIES.join(", ")})`);
    score.category = raw.category as Category;
  }
  if (raw.tips !== undefined) {
    if (!Array.isArray(raw.tips) || raw.tips.some((t) => typeof t !== "string")) fail("tips precisa ser uma lista de textos");
    score.tips = raw.tips as string[];
  }
  if (ticksPerMeasure(score) !== Math.floor(ticksPerMeasure(score)) || score.resolution < score.timeSignature[1]) {
    fail("resolution menor que a figura da batida");
  }
  const maxTick = ticksPerMeasure(score);

  (raw.measures as unknown[]).forEach((m, mi) => {
    const events = (m as { events?: unknown })?.events;
    if (!Array.isArray(events)) fail(`compasso ${mi + 1}: events em falta`);
    score.measures.push({
      events: (events as unknown[])
        .map((e, ei) => {
          const ev = e as Record<string, unknown>;
          const where = `compasso ${mi + 1}, evento ${ei + 1}`;
          if (!Number.isInteger(ev.tick) || (ev.tick as number) < 0 || (ev.tick as number) >= maxTick) {
            fail(`${where}: tick fora do compasso (0–${maxTick - 1})`);
          }
          if (!isDrumPiece(ev.piece)) fail(`${where}: peça desconhecida "${String(ev.piece)}"`);
          const velocity = ev.velocity === undefined ? 100 : ev.velocity;
          if (!Number.isInteger(velocity) || (velocity as number) < 1 || (velocity as number) > 127) {
            fail(`${where}: velocity precisa estar entre 1 e 127`);
          }
          const out: DrumEvent = { tick: ev.tick as number, piece: ev.piece as DrumPiece, velocity: velocity as number };
          if (ev.sticking !== undefined) {
            if (ev.sticking !== "R" && ev.sticking !== "L") fail(`${where}: sticking precisa ser "R" ou "L"`);
            out.sticking = ev.sticking as "R" | "L";
          }
          if (ev.duration !== undefined) {
            const d = ev.duration as number;
            if (!Number.isInteger(d) || d < 1 || out.tick + d > maxTick) fail(`${where}: duration inválida`);
            out.duration = d;
          }
          return out;
        })
        .sort((a, b) => a.tick - b.tick),
    });
  });
  return score;
}
