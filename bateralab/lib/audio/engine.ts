/**
 * Motor de áudio do BateraLab (Tone.js).
 *
 * ── Como a sincronia funciona ────────────────────────────────────────────────
 * 1. Cada nota da partitura é agendada no Tone.Transport em TICKS
 *    (`transport.schedule(cb, "<n>i")`), ver `timeline.ts`.
 * 2. O Transport chama `cb(time)` um pouco ANTES do instante real (lookahead),
 *    passando `time` = instante exato no relógio do AudioContext. O som é
 *    agendado nesse `time` → precisão de amostra, imune a travões do JS.
 * 3. A parte visual (acender peça, cursor na partitura) NÃO pode ser feita no
 *    callback, que corre adiantado. Usamos `Tone.Draw.schedule(fn, time)`, que
 *    executa `fn` num requestAnimationFrame quando o AudioContext alcança `time`.
 * 4. Como tudo está em ticks, alterar `transport.bpm` a meio da reprodução
 *    reescala o tempo de áudio sem desalinhar som, partitura e kit.
 * 5. Eventos agendados com `transport.schedule` disparam de cada vez que o
 *    Transport passa pelo tick — incluindo depois de um salto de loop — por
 *    isso o loop de compassos não precisa de re-agendamento.
 */
import { type DrumPiece, type DrumScore } from "@/lib/score";
import { createKit, type KitVoices } from "./kit";
import { buildTimeline, measureStartTicks, TRANSPORT_PPQ, type Timeline } from "./timeline";

type ToneModule = typeof import("tone");

export type PlaybackState = "stopped" | "playing" | "paused";

export type EngineEvent =
  /** Uma peça soou (partitura, clique/teclado ou MIDI). Disparado no frame em que soa. */
  | { type: "note"; piece: DrumPiece; velocity: number; source: "score" | "user"; muted?: boolean }
  /** O cursor da partitura chegou a (measure, tick). measure = -1 → reset. */
  | { type: "step"; measure: number; tick: number }
  /** Batida do metrônomo/contagem. measure = -1 durante a contagem. */
  | { type: "beat"; beat: number; measure: number; countIn: boolean }
  | { type: "state"; state: PlaybackState }
  | { type: "ready"; kit: KitVoices["kind"] };

export type EngineListener = (event: EngineEvent) => void;

export interface LoopRange {
  enabled: boolean;
  /** Compasso inicial (0-based, inclusivo). */
  start: number;
  /** Compasso final (0-based, inclusivo). */
  end: number;
}

/** Entrada de diagnóstico de sincronia (ver README → "Testar a sincronia"). */
export interface SyncSample {
  kind: "step" | "beat";
  measure: number;
  tick: number;
  /** Instante agendado do som (s, relógio do AudioContext). */
  audioTime: number;
  /** Relógio do AudioContext quando a parte visual executou. */
  drawTime: number;
  bpm: number;
}

export class DrumEngine {
  private Tone: ToneModule | null = null;
  private kit: KitVoices | null = null;
  private initPromise: Promise<void> | null = null;
  private listeners = new Set<EngineListener>();

  private score: DrumScore | null = null;
  private timeline: Timeline | null = null;
  private scheduledIds: number[] = [];

  private state: PlaybackState = "stopped";
  private bpm = 100;
  private muted = new Set<DrumPiece>();
  private metronome = true;
  private countIn = true;
  private loop: LoopRange = { enabled: false, start: 0, end: 0 };
  /** Fim da contagem em curso (ticks do Transport); -1 = sem contagem. */
  private countInEnd = -1;
  private countInId: number | null = null;
  private metronomeSynth: InstanceType<ToneModule["Synth"]> | null = null;

  /** Amostras de sincronia; null = diagnóstico desligado. */
  debugSync: SyncSample[] | null = null;

  /** Liga o diagnóstico de sincronia e expõe o motor em `window.__bateralab`. */
  enableSyncDebug(): void {
    this.debugSync ??= [];
    (window as unknown as { __bateralab?: DrumEngine }).__bateralab = this;
  }

  // ── ciclo de vida ──────────────────────────────────────────────────────────

  /** Carrega o módulo Tone.js antecipadamente (sem iniciar áudio). */
  preload(): void {
    if (!this.Tone) {
      import("tone").then((mod) => {
        this.Tone ??= mod;
      });
    }
  }

  get isReady(): boolean {
    return this.kit !== null;
  }

  /**
   * Inicia o áudio. PRECISA ser chamado a partir de um gesto do usuário
   * (clique, tecla, toque): os navegadores bloqueiam AudioContext sem isso.
   */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    // Se o Tone já está carregado, `Tone.start()` corre de forma síncrona dentro
    // do gesto — importante no Safari, que é mais estrito que o Chrome.
    const started = this.Tone?.start();
    this.initPromise = (async () => {
      const Tone = this.Tone ?? (this.Tone = await import("tone"));
      await (started ?? Tone.start());
      const ctx = Tone.getContext();
      // Lookahead mais curto = menos atraso entre clique/tecla e som, mantendo
      // folga suficiente para o agendamento do Transport.
      ctx.lookAhead = 0.05;
      const transport = Tone.getTransport();
      transport.PPQ = TRANSPORT_PPQ;
      transport.bpm.value = this.bpm;
      this.metronomeSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
        volume: -6,
      }).toDestination();
      this.kit = await createKit(Tone);
      this.applyLoop();
      this.scheduleScore();
      this.emit({ type: "ready", kit: this.kit.kind });
    })();
    return this.initPromise;
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent) {
    for (const l of this.listeners) l(event);
  }

  // ── partitura ──────────────────────────────────────────────────────────────

  setScore(score: DrumScore): void {
    if (this.state !== "stopped") this.stop();
    this.score = score;
    this.timeline = buildTimeline(score);
    this.loop = { enabled: false, start: 0, end: score.measures.length - 1 };
    this.applyLoop();
    this.scheduleScore();
  }

  /** (Re)agenda todas as notas e batidas no Transport. */
  private scheduleScore() {
    const Tone = this.Tone;
    const tl = this.timeline;
    if (!Tone || !this.kit || !tl) return;
    const transport = Tone.getTransport();
    const draw = Tone.getDraw();

    this.scheduledIds.forEach((id) => transport.clear(id));
    this.scheduledIds = [];

    // Notas: o som é agendado em `time`; a parte visual via Draw no mesmo `time`.
    for (const step of tl.steps) {
      const id = transport.schedule((time) => {
        if (this.isCountingIn(step.transportTicks)) return; // silêncio na contagem
        const audible = step.notes.filter((n) => !this.muted.has(n.piece));
        for (const note of audible) this.kit!.trigger(note.piece, time, note.velocity);
        draw.schedule(() => {
          this.recordSync("step", step.measure, step.tick, time);
          this.emit({ type: "step", measure: step.measure, tick: step.tick });
          // Peças silenciadas também acendem: mostram o que o aluno deve tocar.
          for (const note of step.notes) {
            this.emit({
              type: "note",
              piece: note.piece,
              velocity: note.velocity,
              source: "score",
              muted: this.muted.has(note.piece),
            });
          }
        }, time);
      }, `${step.transportTicks}i`);
      this.scheduledIds.push(id);
    }

    // Metrônomo + contagem: um evento por batida em todos os slots.
    for (const b of tl.beats) {
      const id = transport.schedule((time) => {
        const countIn = this.isCountingIn(b.transportTicks);
        if (!countIn && b.slot === 0) return; // slot 0 só existe para a contagem
        if (countIn || this.metronome) {
          // Tempo 1 mais agudo (acento).
          this.metronomeSynth?.triggerAttackRelease(b.beat === 0 ? "C6" : "G5", 0.03, time, b.beat === 0 ? 1 : 0.6);
        }
        draw.schedule(() => {
          this.recordSync("beat", countIn ? -1 : b.slot - 1, b.beat, time);
          this.emit({ type: "beat", beat: b.beat, measure: countIn ? -1 : b.slot - 1, countIn });
        }, time);
      }, `${b.transportTicks}i`);
      this.scheduledIds.push(id);
    }

    // Fim da partitura (sem loop): parar no compasso seguinte ao último.
    const endTicks = measureStartTicks(tl, tl.measureCount);
    this.scheduledIds.push(
      transport.schedule((time) => {
        if (this.loop.enabled) return;
        draw.schedule(() => this.stop(), time);
      }, `${endTicks}i`),
    );
  }

  private isCountingIn(transportTicks: number) {
    return this.countInEnd >= 0 && transportTicks < this.countInEnd;
  }

  // ── transporte ─────────────────────────────────────────────────────────────

  async play(): Promise<void> {
    await this.init();
    const Tone = this.Tone!;
    const tl = this.timeline;
    if (!tl) return;
    const transport = Tone.getTransport();

    if (this.state === "paused") {
      transport.start();
    } else {
      const firstMeasure = this.loop.enabled ? this.loop.start : 0;
      const startTicks = measureStartTicks(tl, firstMeasure);
      // Com contagem, o Transport arranca um compasso antes; as notas desse
      // compasso são silenciadas por `isCountingIn` até `countInEnd`.
      const from = this.countIn ? startTicks - tl.measureTicks : startTicks;
      this.countInEnd = this.countIn ? startTicks : -1;
      this.clearCountIn();
      if (this.countIn) {
        // Termina a contagem mesmo que o loop mude entretanto para trás.
        this.countInId = transport.scheduleOnce(() => {
          this.countInEnd = -1;
        }, `${startTicks}i`);
      }
      this.emit({ type: "step", measure: -1, tick: 0 });
      // Pequena margem para o primeiro evento não chegar "atrasado".
      transport.start("+0.05", `${from}i`);
    }
    this.setState("playing");
  }

  pause(): void {
    if (!this.Tone || this.state !== "playing") return;
    this.Tone.getTransport().pause();
    this.setState("paused");
  }

  stop(): void {
    if (this.Tone) {
      this.Tone.getTransport().stop();
      this.Tone.getDraw().cancel(); // descarta destaques visuais ainda pendentes
    }
    this.clearCountIn();
    this.countInEnd = -1;
    this.emit({ type: "step", measure: -1, tick: 0 });
    this.setState("stopped");
  }

  private clearCountIn() {
    if (this.countInId !== null) this.Tone?.getTransport().clear(this.countInId);
    this.countInId = null;
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.emit({ type: "state", state });
  }

  getState(): PlaybackState {
    return this.state;
  }

  // ── controles de estudo ────────────────────────────────────────────────────

  /** Muda o andamento sem perder a sincronia (posições estão em ticks). */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.Tone) this.Tone.getTransport().bpm.value = bpm;
  }

  setMetronome(on: boolean): void {
    this.metronome = on;
  }

  setCountIn(on: boolean): void {
    this.countIn = on;
  }

  setMuted(piece: DrumPiece, muted: boolean): void {
    if (muted) this.muted.add(piece);
    else this.muted.delete(piece);
  }

  setLoop(loop: LoopRange): void {
    const max = (this.timeline?.measureCount ?? 1) - 1;
    const start = Math.min(Math.max(0, loop.start), max);
    const end = Math.min(Math.max(start, loop.end), max);
    this.loop = { enabled: loop.enabled, start, end };
    this.applyLoop();
  }

  private applyLoop() {
    const tl = this.timeline;
    if (!this.Tone || !tl) return;
    const transport = this.Tone.getTransport();
    transport.loopStart = `${measureStartTicks(tl, this.loop.start)}i`;
    transport.loopEnd = `${measureStartTicks(tl, this.loop.end + 1)}i`;
    transport.loop = this.loop.enabled;
  }

  // ── tocar ao vivo (clique, teclado, MIDI) ──────────────────────────────────

  /** Toca uma peça já (ignora o mute: silenciar serve para o aluno tocar a peça). */
  async hit(piece: DrumPiece, velocity = 100): Promise<void> {
    if (!this.kit) await this.init();
    // `immediate()` = agora, sem o lookahead do Transport → latência mínima.
    this.kit!.trigger(piece, this.Tone!.immediate(), velocity);
    this.emit({ type: "note", piece, velocity, source: "user" });
  }

  private recordSync(kind: SyncSample["kind"], measure: number, tick: number, audioTime: number) {
    if (!this.debugSync || !this.Tone) return;
    this.debugSync.push({
      kind,
      measure,
      tick,
      audioTime,
      drawTime: this.Tone.getContext().currentTime,
      bpm: this.Tone.getTransport().bpm.value,
    });
  }

  dispose(): void {
    this.stop();
    this.kit?.dispose();
    this.metronomeSynth?.dispose();
    this.listeners.clear();
  }
}

/** Instância única: o AudioContext é global ao separador. */
let engine: DrumEngine | null = null;
export function getEngine(): DrumEngine {
  engine ??= new DrumEngine();
  return engine;
}
