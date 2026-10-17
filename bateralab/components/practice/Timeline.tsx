"use client";

/**
 * Linha do tempo clicável: progresso, região do loop A–B, marcações e (para
 * arquivos) a forma de onda. Clique ou arraste para ir a um ponto;
 * Shift+arrastar seleciona a região do loop.
 */
import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/practice/media";
import type { Marker } from "@/lib/practice/storage";

interface Props {
  time: number;
  duration: number;
  a: number | null;
  b: number | null;
  loop: boolean;
  markers: Marker[];
  peaks?: Float32Array | null;
  onSeek: (seconds: number) => void;
  onSelectRange: (a: number, b: number) => void;
}

export default function Timeline({ time, duration, a, b, loop, markers, peaks, onSeek, onSelectRange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ start: number; range: boolean } | null>(null);

  // Forma de onda (redesenha ao redimensionar).
  useEffect(() => {
    const canvas = canvasRef.current;
    const bar = barRef.current;
    if (!canvas || !bar || !peaks) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = bar.clientWidth;
      const h = bar.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(161, 161, 170, 0.55)";
      const cols = Math.floor(w / 2);
      for (let x = 0; x < cols; x++) {
        const p = peaks[Math.floor((x / cols) * peaks.length)] ?? 0;
        const bh = Math.max(1, p * (h - 6));
        ctx.fillRect(x * 2, (h - bh) / 2, 1.2, bh);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [peaks]);

  const toSeconds = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
  };

  const pct = (s: number) => (duration > 0 ? `${(s / duration) * 100}%` : "0%");
  const hasRange = a !== null && b !== null && b > a;

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Posição na música"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={formatTime(time)}
        className={`relative w-full cursor-pointer touch-none select-none overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 ${peaks ? "h-24" : "h-12"}`}
        onPointerDown={(e) => {
          if (!duration) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const s = toSeconds(e.clientX);
          dragRef.current = { start: s, range: e.shiftKey };
          if (!e.shiftKey) onSeek(s);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          const s = toSeconds(e.clientX);
          if (drag.range) onSelectRange(Math.min(drag.start, s), Math.max(drag.start, s));
          else onSeek(s);
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
      >
        {peaks && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
        {hasRange && (
          <div
            className={`absolute inset-y-0 border-x-2 ${loop ? "border-amber-400 bg-amber-400/20" : "border-zinc-500 bg-zinc-500/15"}`}
            style={{ left: pct(a!), width: `calc(${pct(b!)} - ${pct(a!)})` }}
          />
        )}
        {a !== null && !hasRange && <div className="absolute inset-y-0 w-0.5 bg-amber-400" style={{ left: pct(a) }} />}
        <div className="absolute inset-y-0 left-0 bg-sky-500/15" style={{ width: pct(time) }} />
        <div className="absolute inset-y-0 w-0.5 bg-sky-400" style={{ left: pct(time) }} />
        {markers.map((m) => (
          <div key={m.id} className="absolute top-0 h-2 w-0.5 bg-emerald-400" style={{ left: pct(m.time) }} title={m.label} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-xs text-zinc-500">
        <span>{formatTime(time, true)}</span>
        <span className="hidden sm:inline">Shift + arrastar = escolher trecho do loop</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
