#!/usr/bin/env node
/**
 * Gera content/exercises/*.json a partir do catálogo em exercise-catalog.mjs.
 *
 * Cada compasso é escrito como "linhas de grade", uma por peça, com um
 * caractere por tick da grade (`resolution`). Espaços e "|" são ignorados
 * (servem só para separar os tempos visualmente):
 *
 *   x  nota normal (velocity 100)      X  acento (125)
 *   g  nota fantasma (35)              -  ou .  pausa
 *
 * Linhas: hh (chimbal fechado), ho (chimbal aberto), sn (caixa), bd (bumbo),
 * t1, t2, ft (surdo), cr (ataque), rd (condução) e st (mãos: R/L/-).
 *
 * Uso: npm run exercises     (apaga e recria todos os .json gerados)
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG } from "./exercise-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content", "exercises");

const LANES = {
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
const VELOCITY = { x: 100, X: 125, g: 35 };
const clean = (s) => s.replace(/[\s|]/g, "");

function ticksPerMeasure([beats, unit], resolution) {
  return (resolution * beats) / unit;
}

function buildMeasure(bar, ex, where) {
  const len = ticksPerMeasure(ex.timeSignature, ex.resolution);
  const events = [];
  for (const [lane, raw] of Object.entries(bar)) {
    if (lane === "st") continue;
    const piece = LANES[lane];
    if (!piece) throw new Error(`${where}: linha desconhecida "${lane}"`);
    const cells = clean(raw);
    if (cells.length !== len) throw new Error(`${where}: linha ${lane} tem ${cells.length} ticks, esperado ${len}`);
    [...cells].forEach((c, tick) => {
      if (c === "-" || c === ".") return;
      const velocity = VELOCITY[c];
      if (!velocity) throw new Error(`${where}: símbolo "${c}" inválido na linha ${lane}`);
      events.push({ tick, piece, velocity });
    });
  }
  if (bar.st) {
    const cells = clean(bar.st);
    if (cells.length !== len) throw new Error(`${where}: linha st tem ${cells.length} ticks, esperado ${len}`);
    [...cells].forEach((c, tick) => {
      if (c !== "R" && c !== "L") return;
      for (const e of events) if (e.tick === tick && e.piece !== "kick") e.sticking = c;
    });
  }
  const order = Object.values(LANES);
  events.sort((a, b) => a.tick - b.tick || order.indexOf(a.piece) - order.indexOf(b.piece));
  return { events };
}

// Remove só os arquivos gerados antes (marcados com "generated": true).
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(outDir, f), "utf8"));
  if (data.generated) rmSync(join(outDir, f));
}

const ids = new Set();
CATALOG.forEach((ex, index) => {
  if (ids.has(ex.id)) throw new Error(`id repetido: ${ex.id}`);
  ids.add(ex.id);
  const bars = ex.bars.map((bar, i) => buildMeasure(bar, ex, `${ex.id}, compasso ${i + 1}`));
  const score = {
    id: ex.id,
    generated: true,
    order: index,
    title: ex.title,
    description: ex.description,
    level: ex.level,
    category: ex.category,
    style: ex.style,
    tips: ex.tips,
    bpm: ex.bpm,
    goalBpm: ex.goalBpm,
    timeSignature: ex.timeSignature,
    resolution: ex.resolution,
    measures: bars,
  };
  // JSON legível: um evento por linha.
  const head = JSON.stringify({ ...score, measures: undefined }, null, 2).replace(/\n}$/, "");
  const measures = bars
    .map((m) => `    {\n      "events": [\n${m.events.map((e) => `        ${JSON.stringify(e)}`).join(",\n")}\n      ]\n    }`)
    .join(",\n");
  const text = `${head},\n  "measures": [\n${measures}\n  ]\n}\n`
    .replace(/"timeSignature": \[\n\s+(\d+),\n\s+(\d+)\n\s+\]/, '"timeSignature": [$1, $2]');
  writeFileSync(join(outDir, `${ex.id}.json`), text);
});
console.log(`✓ ${CATALOG.length} exercícios gerados em content/exercises/`);
