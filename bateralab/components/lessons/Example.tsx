"use client";

/**
 * Exemplo de aula: partitura curta + botão ouvir (+ bateria opcional).
 * Todos os exemplos usam o mesmo motor de áudio; tocar um para o anterior.
 */
import { useEffect, useMemo, useState } from "react";
import DrumKit from "@/components/DrumKit";
import ScoreView from "@/components/ScoreView";
import { getEngine } from "@/lib/audio/engine";
import type { DrumScore } from "@/lib/score";

const NO_LOOP = { enabled: false, start: 0, end: 0 };

export default function Example({
  score,
  caption,
  kit = false,
  countIn = true,
}: {
  score: DrumScore;
  caption?: string;
  /** Mostra a bateria ao lado, acendendo junto com a partitura. */
  kit?: boolean;
  countIn?: boolean;
}) {
  const engine = useMemo(() => getEngine(), []);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    engine.preload();
    return engine.subscribe((ev) => {
      if (ev.type === "state") setPlaying(ev.state === "playing" && engine.getScore() === score);
    });
  }, [engine, score]);

  const toggle = async () => {
    if (playing) {
      engine.stop();
      return;
    }
    engine.setScore(score);
    engine.resetOptions();
    engine.setCountIn(countIn);
    engine.setBpm(score.bpm);
    await engine.play();
  };

  return (
    <figure className="my-4 flex flex-col gap-2">
      <div className={kit ? "grid items-start gap-3 md:grid-cols-[minmax(0,3fr)_minmax(220px,2fr)]" : ""}>
        <ScoreView score={score} engine={engine} loop={NO_LOOP} compact />
        {kit && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
            <DrumKit engine={engine} onHit={(p) => void engine.hit(p)} muted={new Set()} />
          </div>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <button
          type="button"
          onClick={() => void toggle()}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${playing ? "bg-zinc-700 text-zinc-100" : "bg-sky-500 text-zinc-950 hover:bg-sky-400"}`}
        >
          {playing ? "■ Parar" : "▶ Ouvir"}
        </button>
        <span className="font-mono text-xs text-zinc-500">{score.bpm} BPM</span>
        {caption && <span>{caption}</span>}
      </figcaption>
    </figure>
  );
}
