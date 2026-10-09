"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getEngine, type LoopRange, type PlaybackState } from "@/lib/audio/engine";
import { KEY_TO_PIECE, PIECE_KEY_LABEL, PIECE_LABEL } from "@/lib/input/keymap";
import { useMidiInput } from "@/lib/input/use-midi-input";
import { DRUM_PIECES, type DrumPiece, type DrumScore } from "@/lib/score";
import DrumKit from "./DrumKit";
import PieceToggles from "./PieceToggles";
import ScoreView from "./ScoreView";
import Transport from "./Transport";

export default function StudyScreen({ score }: { score: DrumScore }) {
  const engine = useMemo(() => getEngine(), []);
  const [state, setState] = useState<PlaybackState>("stopped");
  const [bpm, setBpm] = useState(score.bpm);
  const [metronome, setMetronome] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [loop, setLoop] = useState<LoopRange>({ enabled: false, start: 0, end: score.measures.length - 1 });
  const [muted, setMuted] = useState<Set<DrumPiece>>(new Set());
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [audioReady, setAudioReady] = useState(engine.isReady);
  const [kitKind, setKitKind] = useState<string | null>(null);

  // Liga a partitura ao motor e aplica as preferências atuais.
  useEffect(() => {
    engine.preload();
    engine.setScore(score);
    engine.setBpm(score.bpm);
    DRUM_PIECES.forEach((p) => engine.setMuted(p, false));
    engine.setMetronome(true);
    engine.setCountIn(true);
    return () => engine.stop();
  }, [engine, score]);

  // Diagnóstico: abrir com ?debug=sync expõe o motor em window.__bateralab e
  // coleta amostras de sincronia (ver README → "Testar a sincronia").
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debug") === "sync") {
      engine.enableSyncDebug();
    }
  }, [engine]);

  useEffect(
    () =>
      engine.subscribe((ev) => {
        if (ev.type === "state") {
          setState(ev.state);
          if (ev.state === "stopped") setCountInBeat(null);
        } else if (ev.type === "beat") {
          setCountInBeat(ev.countIn ? ev.beat + 1 : null);
        } else if (ev.type === "ready") {
          setAudioReady(true);
          setKitKind(ev.kit);
        }
      }),
    [engine],
  );

  const hit = useCallback((piece: DrumPiece, velocity = 100) => void engine.hit(piece, velocity), [engine]);
  const midi = useMidiInput(hit);

  // Atalhos de teclado (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        if (!(t instanceof HTMLInputElement && t.type === "range")) return;
      }
      const piece = KEY_TO_PIECE[e.code];
      if (!piece) return;
      e.preventDefault(); // Espaço não deve rolar a página nem "clicar" botões
      hit(piece, e.shiftKey ? 127 : 100);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit]);

  const updateLoop = (next: LoopRange) => {
    setLoop(next);
    engine.setLoop(next);
  };

  const onMeasureClick = (measure: number, extend: boolean) => {
    if (extend && loop.enabled) {
      updateLoop({ enabled: true, start: Math.min(loop.start, measure), end: Math.max(loop.end, measure) });
    } else {
      updateLoop({ enabled: true, start: measure, end: measure });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Transport
        state={state}
        bpm={bpm}
        metronome={metronome}
        countIn={countIn}
        loop={loop}
        measureCount={score.measures.length}
        countInBeat={countInBeat}
        onPlay={() => void engine.play()}
        onPause={() => engine.pause()}
        onStop={() => engine.stop()}
        onBpm={(v) => {
          setBpm(v);
          engine.setBpm(v);
        }}
        onMetronome={(on) => {
          setMetronome(on);
          engine.setMetronome(on);
        }}
        onCountIn={(on) => {
          setCountIn(on);
          engine.setCountIn(on);
        }}
        onLoop={updateLoop}
      />

      {!audioReady && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          O som liga no primeiro toque: aperte <strong>Tocar</strong>, clique numa peça ou use o teclado.
        </p>
      )}

      {/* Celular: partitura em cima, bateria embaixo. Desktop: lado a lado. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <section aria-label="Partitura" className="min-w-0">
          <ScoreView score={score} engine={engine} loop={loop} onMeasureClick={onMeasureClick} />
          <p className="mt-2 text-xs text-zinc-500">
            Clique num compasso para fazer loop dele; Shift+clique para estender o loop.
          </p>
        </section>

        <section aria-label="Bateria" className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
            <DrumKit engine={engine} onHit={hit} muted={muted} />
          </div>
          <PieceToggles
            muted={muted}
            onToggle={(piece) => {
              const next = new Set(muted);
              if (next.has(piece)) next.delete(piece);
              else next.add(piece);
              engine.setMuted(piece, next.has(piece));
              setMuted(next);
            }}
          />
          <details className="text-xs text-zinc-400">
            <summary className="cursor-pointer select-none text-zinc-300">Atalhos de teclado e MIDI</summary>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {DRUM_PIECES.map((p) => (
                <li key={p} className="flex justify-between gap-2">
                  <span>{PIECE_LABEL[p]}</span>
                  <kbd className="font-mono text-zinc-300">{PIECE_KEY_LABEL[p]}</kbd>
                </li>
              ))}
            </ul>
            <p className="mt-2">Shift + tecla = batida forte.</p>
            <p className="mt-1">
              MIDI:{" "}
              {midi.kind === "unsupported"
                ? "este navegador não suporta Web MIDI (use Chrome ou Edge)."
                : midi.kind === "denied"
                  ? "acesso negado pelo navegador."
                  : midi.devices.length
                    ? `ligado — ${midi.devices.join(", ")}`
                    : "nenhuma bateria eletrônica detectada (ligue por USB)."}
            </p>
            {kitKind && <p className="mt-1">Som: {kitKind === "samples" ? "samples WAV" : "kit sintetizado (fallback)"}.</p>}
          </details>
        </section>
      </div>
    </div>
  );
}
