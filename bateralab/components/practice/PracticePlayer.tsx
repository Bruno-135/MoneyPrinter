"use client";

/**
 * Controles de estudo para tocar junto: play/pause, voltar/avançar, loop A–B,
 * velocidade e marcações. Funciona com qualquer MediaController (YouTube ou arquivo).
 *
 * O loop é aplicado num ciclo requestAnimationFrame: quando a posição passa de
 * B, voltamos para A. A posição na tela é atualizada no mesmo ciclo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime, type MediaController } from "@/lib/practice/media";
import { loadPractice, type Marker, type PracticeState, savePractice } from "@/lib/practice/storage";
import Timeline from "./Timeline";

interface Props {
  controller: MediaController;
  /** Chave para guardar loop/velocidade/marcações desta música. */
  sourceKey: string;
  peaks?: Float32Array | null;
}

const SKIP = 5;
const NUDGE = 0.1;

const btn =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-40";
const ghost = `${btn} border border-zinc-700 text-zinc-200 hover:bg-zinc-800`;

export default function PracticePlayer({ controller, sourceKey, peaks }: Props) {
  const [state, setState] = useState<PracticeState>(() => loadPractice(sourceKey));
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rates, setRates] = useState<number[]>([1]);
  // Cópia do estado para o ciclo de animação e os atalhos (sem re-subscrever).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const update = useCallback((patch: Partial<PracticeState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      stateRef.current = next;
      savePractice(sourceKey, next);
      return next;
    });
  }, [sourceKey]);

  // Estado do tocador + velocidade guardada.
  useEffect(() => {
    const sync = () => {
      setPlaying(controller.isPlaying());
      setDuration(controller.getDuration());
      setRates(controller.getRates());
    };
    sync();
    controller.setRate(stateRef.current.rate);
    return controller.subscribe(sync);
  }, [controller]);

  // Ciclo de animação: posição na tela + aplicação do loop A–B.
  useEffect(() => {
    let raf = 0;
    let shown = -1;
    const tick = () => {
      const t = controller.getTime();
      const { a, b, loop } = stateRef.current;
      if (loop && a !== null && b !== null && b > a && controller.isPlaying() && t >= b) {
        controller.seek(a);
      }
      if (Math.abs(t - shown) >= 0.05) {
        shown = t;
        setTime(t);
        const d = controller.getDuration();
        setDuration((prev) => (prev !== d ? d : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  const seek = useCallback(
    (s: number) => {
      controller.seek(Math.max(0, Math.min(s, controller.getDuration() || s)));
      setTime(controller.getTime());
    },
    [controller],
  );

  const togglePlay = useCallback(() => {
    if (controller.isPlaying()) {
      controller.pause();
      return;
    }
    // Com loop ativo e fora do trecho, começa do A.
    const { a, b, loop } = stateRef.current;
    const t = controller.getTime();
    if (loop && a !== null && b !== null && (t < a || t >= b)) controller.seek(a);
    controller.play();
  }, [controller]);

  const setRate = useCallback(
    (rate: number) => {
      controller.setRate(rate);
      update({ rate });
    },
    [controller, update],
  );

  const stepRate = useCallback(
    (dir: 1 | -1) => {
      const list = controller.getRates();
      const current = controller.getRate();
      const idx = list.findIndex((r) => r >= current - 1e-6);
      const next = list[Math.min(list.length - 1, Math.max(0, (idx < 0 ? list.length - 1 : idx) + dir))];
      if (next !== undefined) setRate(next);
    },
    [controller, setRate],
  );

  const markA = useCallback(() => {
    const t = controller.getTime();
    const { b } = stateRef.current;
    update({ a: t, b: b !== null && b > t ? b : null });
  }, [controller, update]);

  const markB = useCallback(() => {
    const t = controller.getTime();
    const { a } = stateRef.current;
    if (a === null || t <= a) update({ a: Math.max(0, t - 4), b: t, loop: true });
    else update({ b: t, loop: true });
  }, [controller, update]);

  const addMarker = useCallback(() => {
    const t = controller.getTime();
    const label = `Marca ${stateRef.current.markers.length + 1}`;
    const marker: Marker = { id: `${Date.now()}`, time: t, label };
    update({ markers: [...stateRef.current.markers, marker].sort((x, y) => x.time - y.time) });
  }, [controller, update]);

  // Atalhos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const actions: Record<string, () => void> = {
        Space: togglePlay,
        ArrowLeft: () => seek(controller.getTime() - SKIP),
        ArrowRight: () => seek(controller.getTime() + SKIP),
        BracketLeft: markA,
        BracketRight: markB,
        KeyL: () => update({ loop: !stateRef.current.loop }),
        KeyM: addMarker,
        Minus: () => stepRate(-1),
        Equal: () => stepRate(1),
        Home: () => seek(stateRef.current.loop && stateRef.current.a !== null ? stateRef.current.a : 0),
      };
      const action = actions[e.code];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controller, togglePlay, seek, markA, markB, addMarker, stepRate, update]);

  const { a, b, loop, markers } = state;
  const rate = state.rate;
  const hasRange = a !== null && b !== null && b > a;
  const presets = [0.5, 0.75, 1].filter((r) => rates.includes(r));

  return (
    <div className="flex flex-col gap-4">
      <Timeline
        time={time}
        duration={duration}
        a={a}
        b={b}
        loop={loop}
        markers={markers}
        peaks={peaks}
        onSeek={seek}
        onSelectRange={(from, to) => update({ a: from, b: to, loop: true })}
      />

      {/* Transporte */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghost} onClick={() => seek(time - SKIP)} aria-label="Voltar 5 segundos">
          « 5s
        </button>
        <button
          type="button"
          className={`${btn} min-w-24 bg-sky-500 text-zinc-950 hover:bg-sky-400`}
          onClick={togglePlay}
        >
          {playing ? "Pausar" : "Tocar"}
        </button>
        <button type="button" className={ghost} onClick={() => seek(time + SKIP)} aria-label="Avançar 5 segundos">
          5s »
        </button>
        <button
          type="button"
          className={ghost}
          onClick={() => seek(loop && a !== null ? a : 0)}
          title={loop && a !== null ? "Voltar ao início do loop" : "Voltar ao início"}
        >
          ⏮ Início
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Loop A–B */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Loop de trecho</h3>
            <button
              type="button"
              aria-pressed={loop}
              disabled={!hasRange}
              onClick={() => update({ loop: !loop })}
              className={`${btn} h-8 border ${loop ? "border-amber-400/60 bg-amber-400/15 text-amber-200" : "border-zinc-700 text-zinc-400"}`}
            >
              {loop ? "Loop ligado" : "Loop desligado"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PointEditor
              label="A (início)"
              value={a}
              onMark={markA}
              onNudge={(d) => a !== null && update({ a: Math.max(0, Math.min(a + d, (b ?? Infinity) - NUDGE)) })}
              onJump={() => a !== null && seek(a)}
            />
            <PointEditor
              label="B (fim)"
              value={b}
              onMark={markB}
              onNudge={(d) => b !== null && update({ b: Math.min(duration || Infinity, Math.max(b + d, (a ?? 0) + NUDGE)) })}
              onJump={() => b !== null && seek(Math.max(0, b - 2))}
            />
          </div>
          {(a !== null || b !== null) && (
            <button type="button" className="mt-2 text-xs text-zinc-500 hover:text-zinc-300" onClick={() => update({ a: null, b: null, loop: false })}>
              Limpar trecho
            </button>
          )}
        </section>

        {/* Velocidade */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Velocidade</h3>
            <span className="font-mono text-lg text-sky-300">{Math.round(rate * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={ghost} onClick={() => stepRate(-1)} aria-label="Mais devagar">
              −
            </button>
            <input
              type="range"
              min={0}
              max={rates.length - 1}
              step={1}
              value={Math.max(0, rates.findIndex((r) => r >= rate - 1e-6))}
              onChange={(e) => setRate(rates[Number(e.target.value)] ?? 1)}
              className="w-full accent-sky-500"
              aria-label="Velocidade"
            />
            <button type="button" className={ghost} onClick={() => stepRate(1)} aria-label="Mais rápido">
              +
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {presets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                className={`${btn} h-8 flex-1 border ${Math.abs(rate - r) < 1e-6 ? "border-sky-500/60 bg-sky-500/15 text-sky-200" : "border-zinc-700 text-zinc-400"}`}
              >
                {Math.round(r * 100)}%
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">O tom da música não muda ao diminuir a velocidade.</p>
        </section>
      </div>

      {/* Marcações */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Marcações</h3>
          <button type="button" className={`${btn} h-8 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10`} onClick={addMarker}>
            + Marcar agora
          </button>
        </div>
        {markers.length === 0 ? (
          <p className="text-xs text-zinc-500">Marque partes da música (intro, refrão, virada…) para voltar a elas rapidamente.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {markers.map((m, i) => {
              const next = markers[i + 1];
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <button type="button" className="w-14 font-mono text-xs text-emerald-300 hover:underline" onClick={() => seek(m.time)}>
                    {formatTime(m.time)}
                  </button>
                  <input
                    value={m.label}
                    onChange={(e) =>
                      update({ markers: markers.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)) })
                    }
                    className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm"
                    aria-label="Nome da marcação"
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap text-xs text-zinc-400 hover:text-amber-300"
                    title="Fazer loop desta marcação até a próxima"
                    onClick={() => {
                      update({ a: m.time, b: next?.time ?? duration, loop: true });
                      seek(m.time);
                    }}
                  >
                    loop
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-600 hover:text-red-400"
                    aria-label={`Apagar ${m.label}`}
                    onClick={() => update({ markers: markers.filter((x) => x.id !== m.id) })}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer select-none text-zinc-300">Atalhos de teclado</summary>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          <li><kbd className="font-mono text-zinc-300">Espaço</kbd> tocar/pausar</li>
          <li><kbd className="font-mono text-zinc-300">← →</kbd> voltar/avançar 5 s</li>
          <li><kbd className="font-mono text-zinc-300">[</kbd> marcar A</li>
          <li><kbd className="font-mono text-zinc-300">]</kbd> marcar B</li>
          <li><kbd className="font-mono text-zinc-300">L</kbd> liga/desliga loop</li>
          <li><kbd className="font-mono text-zinc-300">M</kbd> nova marcação</li>
          <li><kbd className="font-mono text-zinc-300">− =</kbd> velocidade</li>
          <li><kbd className="font-mono text-zinc-300">Home</kbd> voltar ao início</li>
        </ul>
      </details>
    </div>
  );
}

function PointEditor({
  label,
  value,
  onMark,
  onNudge,
  onJump,
}: {
  label: string;
  value: number | null;
  onMark: () => void;
  onNudge: (delta: number) => void;
  onJump: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <button type="button" className={`${ghost} h-9`} onClick={onMark}>
        Marcar {label[0]}
      </button>
      <div className="flex items-center justify-between gap-1">
        <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-200" disabled={value === null} onClick={() => onNudge(-NUDGE)} aria-label={`${label} 0,1 s antes`}>
          −0,1
        </button>
        <button type="button" className="font-mono text-sm text-amber-300 disabled:text-zinc-600" disabled={value === null} onClick={onJump}>
          {value === null ? "—" : formatTime(value, true)}
        </button>
        <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-200" disabled={value === null} onClick={() => onNudge(NUDGE)} aria-label={`${label} 0,1 s depois`}>
          +0,1
        </button>
      </div>
    </div>
  );
}
