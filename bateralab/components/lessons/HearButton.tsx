"use client";

import { getEngine } from "@/lib/audio/engine";
import type { DrumPiece } from "@/lib/score";

/** Botão pequeno que toca uma peça (tabelas das aulas). */
export default function HearButton({ piece, label = "ouvir" }: { piece: DrumPiece; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => void getEngine().hit(piece)}
      className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-sky-300 hover:bg-zinc-800"
    >
      ▶ {label}
    </button>
  );
}
