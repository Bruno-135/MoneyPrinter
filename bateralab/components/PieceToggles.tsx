"use client";

import { PIECE_KEY_LABEL, PIECE_LABEL } from "@/lib/input/keymap";
import { DRUM_PIECES, type DrumPiece } from "@/lib/score";

interface Props {
  muted: Set<DrumPiece>;
  onToggle: (piece: DrumPiece) => void;
}

/**
 * Silenciar peças individualmente: a peça silenciada deixa de soar na reprodução,
 * mas continua acendendo no kit (contorno pulsante) para o aluno a tocar.
 */
export default function PieceToggles({ muted, onToggle }: Props) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Peças — desligue uma para tocá-la você
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
        {DRUM_PIECES.map((piece) => {
          const isMuted = muted.has(piece);
          return (
            <button
              key={piece}
              type="button"
              aria-pressed={!isMuted}
              onClick={() => onToggle(piece)}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                isMuted
                  ? "border-zinc-800 bg-zinc-950 text-zinc-500 line-through"
                  : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
              }`}
            >
              <span className="truncate">{PIECE_LABEL[piece]}</span>
              <kbd className="hidden rounded bg-zinc-800 px-1.5 sm:inline py-0.5 font-mono text-[10px] text-zinc-400 no-underline">
                {PIECE_KEY_LABEL[piece]}
              </kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
