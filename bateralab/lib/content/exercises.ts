/**
 * Carrega os exercícios de content/exercises/*.json (só no servidor / build).
 * Para adicionar um exercício basta criar um novo .json nessa pasta.
 */
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type DrumScore, parseScore } from "@/lib/score";

const DIR = join(process.cwd(), "content", "exercises");

export function listExercises(): (DrumScore & { id: string })[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const id = file.replace(/\.json$/, "");
      const score = parseScore(JSON.parse(readFileSync(join(DIR, file), "utf8")), file);
      return { ...score, id };
    });
}

export function getExercise(id: string): (DrumScore & { id: string }) | undefined {
  return listExercises().find((e) => e.id === id);
}
