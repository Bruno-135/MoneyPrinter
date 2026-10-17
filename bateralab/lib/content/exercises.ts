/**
 * Carrega os exercícios de content/exercises/*.json (só no servidor / build).
 * Para adicionar um exercício basta criar um novo .json nessa pasta.
 */
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type DrumScore, parseScore } from "@/lib/score";

const DIR = join(process.cwd(), "content", "exercises");

export type Exercise = DrumScore & { id: string };

const LEVEL_ORDER = { iniciante: 0, intermediario: 1, avancado: 2 } as const;

/** Todos os exercícios, ordenados por nível e depois pela ordem do catálogo. */
export function listExercises(): Exercise[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const id = file.replace(/\.json$/, "");
      const score = parseScore(JSON.parse(readFileSync(join(DIR, file), "utf8")), file);
      return { ...score, id };
    })
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level ?? "iniciante"] - LEVEL_ORDER[b.level ?? "iniciante"] ||
        (a.order ?? 999) - (b.order ?? 999) ||
        a.id.localeCompare(b.id),
    );
}

export function getExercise(id: string): Exercise | undefined {
  return listExercises().find((e) => e.id === id);
}
