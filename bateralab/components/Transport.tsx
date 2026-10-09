"use client";

import type { LoopRange, PlaybackState } from "@/lib/audio/engine";

export const BPM_MIN = 40;
export const BPM_MAX = 220;

interface Props {
  state: PlaybackState;
  bpm: number;
  metronome: boolean;
  countIn: boolean;
  loop: LoopRange;
  measureCount: number;
  /** Batida atual da contagem (1-based) ou null fora da contagem. */
  countInBeat: number | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onBpm: (bpm: number) => void;
  onMetronome: (on: boolean) => void;
  onCountIn: (on: boolean) => void;
  onLoop: (loop: LoopRange) => void;
}

const btn =
  "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-40";

export default function Transport(p: Props) {
  const playing = p.state === "playing";
  const measures = Array.from({ length: p.measureCount }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${btn} bg-sky-500 text-zinc-950 hover:bg-sky-400`}
          onClick={playing ? p.onPause : p.onPlay}
          aria-label={playing ? "Pausar" : "Tocar"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          <span className="hidden sm:inline">{playing ? "Pausar" : "Tocar"}</span>
        </button>
        <button
          type="button"
          className={`${btn} bg-zinc-800 text-zinc-100 hover:bg-zinc-700`}
          onClick={p.onStop}
          disabled={p.state === "stopped"}
          aria-label="Parar"
        >
          <StopIcon />
        </button>
        <span
          className={`ml-1 w-8 text-center font-mono text-2xl font-bold text-amber-300 transition-opacity ${p.countInBeat ? "opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          {p.countInBeat ?? ""}
        </span>
      </div>

      <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm text-zinc-300">
        <span className="whitespace-nowrap">BPM</span>
        <input
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          value={p.bpm}
          onChange={(e) => p.onBpm(Number(e.target.value))}
          className="w-full accent-sky-500"
          aria-label="Andamento em BPM"
        />
        <input
          type="number"
          min={BPM_MIN}
          max={BPM_MAX}
          value={p.bpm}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= BPM_MIN && v <= BPM_MAX) p.onBpm(v);
          }}
          className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-center font-mono text-zinc-100"
          aria-label="BPM"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Toggle on={p.metronome} onChange={p.onMetronome} label="Metrônomo" />
        <Toggle on={p.countIn} onChange={p.onCountIn} label="Contagem" />
        <Toggle on={p.loop.enabled} onChange={(enabled) => p.onLoop({ ...p.loop, enabled })} label="Loop" />
        <span className={`flex items-center gap-1 text-zinc-400 ${p.loop.enabled ? "" : "opacity-50"}`}>
          <select
            value={p.loop.start}
            onChange={(e) => {
              const start = Number(e.target.value);
              p.onLoop({ ...p.loop, start, end: Math.max(start, p.loop.end) });
            }}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-1 py-1 text-zinc-100"
            aria-label="Início do loop (compasso)"
          >
            {measures.map((m) => (
              <option key={m} value={m}>
                {m + 1}
              </option>
            ))}
          </select>
          a
          <select
            value={p.loop.end}
            onChange={(e) => {
              const end = Number(e.target.value);
              p.onLoop({ ...p.loop, end, start: Math.min(end, p.loop.start) });
            }}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-1 py-1 text-zinc-100"
            aria-label="Fim do loop (compasso)"
          >
            {measures.map((m) => (
              <option key={m} value={m}>
                {m + 1}
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`${btn} h-9 border ${on ? "border-sky-500/60 bg-sky-500/15 text-sky-200" : "border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200"}`}
    >
      {label}
    </button>
  );
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M6 6h12v12H6z" />
  </svg>
);
