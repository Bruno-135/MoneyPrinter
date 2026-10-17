"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type Category, CATEGORIES, CATEGORY_LABEL, type Level, LEVEL_LABEL, LEVELS } from "@/lib/score/types";

export interface CatalogItem {
  id: string;
  title: string;
  description?: string;
  level: Level;
  category: Category;
  style: string;
  bpm: number;
  goalBpm?: number;
  timeSignature: [number, number];
}

const LEVEL_COLOR: Record<Level, string> = {
  iniciante: "text-emerald-300 border-emerald-500/40",
  intermediario: "text-amber-300 border-amber-500/40",
  avancado: "text-rose-300 border-rose-500/40",
};

/** Lista de exercícios agrupada por nível, com filtros por nível, tipo e estilo. */
export default function ExerciseCatalog({ items }: { items: CatalogItem[] }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [style, setStyle] = useState("all");
  const styles = useMemo(() => [...new Set(items.map((i) => i.style))].sort((a, b) => a.localeCompare(b)), [items]);

  const visible = items.filter(
    (i) => (level === "all" || i.level === level) && (category === "all" || i.category === category) && (style === "all" || i.style === style),
  );

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${active ? "border-sky-500/60 bg-sky-500/15 text-sky-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Nível">
          <button type="button" className={chip(level === "all")} onClick={() => setLevel("all")}>
            Todos os níveis
          </button>
          {LEVELS.map((l) => (
            <button key={l} type="button" className={chip(level === l)} onClick={() => setLevel(l)} aria-pressed={level === l}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo">
          <button type="button" className={chip(category === "all")} onClick={() => setCategory("all")}>
            Tudo
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)} aria-pressed={category === c}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-300"
            aria-label="Estilo"
          >
            <option value="all">Todos os estilos</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 && <p className="text-sm text-zinc-500">Nenhum exercício com esses filtros.</p>}

      {LEVELS.map((l) => {
        const group = visible.filter((i) => i.level === l);
        if (!group.length) return null;
        return (
          <section key={l} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 text-lg font-semibold">
              {LEVEL_LABEL[l]}
              <span className="text-sm font-normal text-zinc-500">{group.length} exercícios</span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((ex) => (
                <li key={ex.id}>
                  <Link
                    href={`/exercicios/${ex.id}`}
                    className="flex h-full flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-sky-500/60 hover:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`rounded-full border px-2 py-0.5 ${LEVEL_COLOR[ex.level]}`}>{LEVEL_LABEL[ex.level]}</span>
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">{CATEGORY_LABEL[ex.category]}</span>
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">{ex.style}</span>
                    </div>
                    <h3 className="font-semibold">{ex.title}</h3>
                    {ex.description && <p className="line-clamp-3 text-sm text-zinc-400">{ex.description}</p>}
                    <p className="mt-auto font-mono text-xs text-zinc-500">
                      {ex.timeSignature.join("/")} · {ex.bpm}
                      {ex.goalBpm ? ` → ${ex.goalBpm}` : ""} BPM
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
