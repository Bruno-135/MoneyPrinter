"use client";

/**
 * Kit de bateria em SVG, visto de cima (o baterista está em baixo).
 *
 * Os acendimentos são aplicados diretamente no DOM (classe CSS + reinício da
 * animação) a partir dos eventos `note` do motor, que já chegam no frame em
 * que o som toca (Tone.Draw). Sem estado React → sem atraso de render.
 */
import { useEffect, useRef } from "react";
import type { DrumEngine } from "@/lib/audio/engine";
import { PIECE_KEY_LABEL, PIECE_LABEL } from "@/lib/input/keymap";
import type { DrumPiece } from "@/lib/score";

interface Props {
  engine: DrumEngine;
  onHit: (piece: DrumPiece) => void;
  muted: Set<DrumPiece>;
}

type Shape =
  | { kind: "drum"; cx: number; cy: number; r: number }
  | { kind: "cymbal"; cx: number; cy: number; r: number }
  | { kind: "kick"; x: number; y: number; w: number; h: number }
  | { kind: "ring"; cx: number; cy: number; r: number; inner: number };

/** Geometria das peças (viewBox 500×360). */
const LAYOUT: Record<DrumPiece, { shape: Shape; label: { x: number; y: number } }> = {
  crash: { shape: { kind: "cymbal", cx: 95, cy: 82, r: 62 }, label: { x: 95, y: 82 } },
  ride: { shape: { kind: "cymbal", cx: 412, cy: 112, r: 68 }, label: { x: 412, y: 112 } },
  hihatOpen: { shape: { kind: "ring", cx: 72, cy: 222, r: 50, inner: 30 }, label: { x: 72, y: 184 } },
  hihatClosed: { shape: { kind: "cymbal", cx: 72, cy: 222, r: 30 }, label: { x: 72, y: 222 } },
  tom1: { shape: { kind: "drum", cx: 200, cy: 128, r: 38 }, label: { x: 200, y: 128 } },
  tom2: { shape: { kind: "drum", cx: 296, cy: 128, r: 40 }, label: { x: 296, y: 128 } },
  floorTom: { shape: { kind: "drum", cx: 360, cy: 255, r: 52 }, label: { x: 360, y: 255 } },
  snare: { shape: { kind: "drum", cx: 168, cy: 250, r: 44 }, label: { x: 168, y: 250 } },
  kick: { shape: { kind: "kick", x: 192, y: 196, w: 116, h: 64 }, label: { x: 250, y: 228 } },
};

/** Ordem de desenho: o que fica por cima vem depois. */
const DRAW_ORDER: DrumPiece[] = ["kick", "floorTom", "tom1", "tom2", "snare", "hihatOpen", "hihatClosed", "ride", "crash"];

function PieceShape({ shape }: { shape: Shape }) {
  switch (shape.kind) {
    case "drum":
      return (
        <>
          <circle cx={shape.cx} cy={shape.cy} r={shape.r} className="kit-shell" />
          <circle cx={shape.cx} cy={shape.cy} r={shape.r - 5} className="kit-head kit-flash" />
        </>
      );
    case "cymbal":
      return (
        <>
          <circle cx={shape.cx} cy={shape.cy} r={shape.r} className="kit-cymbal kit-flash" />
          <circle cx={shape.cx} cy={shape.cy} r={shape.r * 0.62} className="kit-cymbal-groove" />
          <circle cx={shape.cx} cy={shape.cy} r={Math.max(5, shape.r * 0.14)} className="kit-cymbal-bell" />
        </>
      );
    case "ring": {
      // Anel = parte do chimbal que se toca "aberto" (o centro é o fechado).
      const { cx, cy, r, inner } = shape;
      const d = `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z M ${cx - inner} ${cy} a ${inner} ${inner} 0 1 1 ${2 * inner} 0 a ${inner} ${inner} 0 1 1 ${-2 * inner} 0 Z`;
      return <path d={d} fillRule="evenodd" className="kit-cymbal kit-flash" />;
    }
    case "kick":
      return (
        <>
          <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={10} className="kit-shell" />
          <rect x={shape.x + 6} y={shape.y + 6} width={shape.w - 12} height={shape.h - 12} rx={6} className="kit-head kit-flash" />
        </>
      );
  }
}

export default function DrumKit({ engine, onHit, muted }: Props) {
  const groupRefs = useRef<Partial<Record<DrumPiece, SVGGElement | null>>>({});

  useEffect(() => {
    return engine.subscribe((ev) => {
      if (ev.type !== "note") return;
      const g = groupRefs.current[ev.piece];
      if (!g) return;
      const cls = ev.muted ? "is-cue" : "is-hit";
      g.style.setProperty("--hit", String(0.45 + (ev.velocity / 127) * 0.55));
      // Reinicia a animação mesmo que a peça já esteja acesa (notas seguidas).
      g.classList.remove("is-hit", "is-cue");
      void g.getBoundingClientRect();
      g.classList.add(cls);
    });
  }, [engine]);

  return (
    <svg viewBox="0 0 500 340" className="h-auto w-full touch-none select-none" role="group" aria-label="Bateria virtual">
      <defs>
        <radialGradient id="cymbal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6d77a" />
          <stop offset="70%" stopColor="#c9962e" />
          <stop offset="100%" stopColor="#8a6214" />
        </radialGradient>
      </defs>
      {DRAW_ORDER.map((piece) => {
        const { shape, label } = LAYOUT[piece];
        return (
          <g
            key={piece}
            ref={(el) => {
              groupRefs.current[piece] = el;
            }}
            data-piece={piece}
            className={`kit-piece cursor-pointer ${muted.has(piece) ? "is-muted" : ""}`}
            role="button"
            aria-label={`${PIECE_LABEL[piece]} (${PIECE_KEY_LABEL[piece]})`}
            onPointerDown={(e) => {
              e.preventDefault();
              onHit(piece);
            }}
          >
            <PieceShape shape={shape} />
            <text x={label.x} y={label.y + 4} textAnchor="middle" className="kit-key">
              {PIECE_KEY_LABEL[piece]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
