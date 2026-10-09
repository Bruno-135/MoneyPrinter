"use client";

/**
 * Partitura de bateria com VexFlow.
 *
 * Sincronia: este componente NÃO usa estado React para o cursor. Subscreve os
 * eventos `step` do motor (que já chegam no frame certo via Tone.Draw) e mexe
 * diretamente nas classes CSS do SVG — evita re-renderizar a partitura a cada
 * semicolcheia, o que a 180 BPM seria ~12 renders por segundo.
 */
import { useEffect, useRef, useState } from "react";
import type { DrumEngine, LoopRange } from "@/lib/audio/engine";
import { type DrumScore, measureToNotation } from "@/lib/score";

type VexModule = typeof import("vexflow/bravura");

interface Props {
  score: DrumScore;
  engine: DrumEngine;
  loop: LoopRange;
  /** Clique num compasso (para escolher o loop). */
  onMeasureClick?: (measure: number, extend: boolean) => void;
}

/** Geometria de cada compasso desenhado (para cursor, loop e scroll). */
interface MeasureBox {
  x: number;
  y: number;
  width: number;
  row: number;
}

const ROW_HEIGHT = 150;
const STAVE_TOP = 30; // espaço para o "o" do chimbal e números de compasso
const MIN_MEASURE_WIDTH = 270;

let vexPromise: Promise<VexModule> | null = null;
function loadVexFlow(): Promise<VexModule> {
  vexPromise ??= import("vexflow/bravura").then(async (mod) => {
    // A entrada "vexflow/bravura" embute as fontes (data URI) e regista-as com
    // FontFace; esperamos que fiquem prontas antes de medir/desenhar glifos.
    // (Não usar VexFlow.loadFonts(): esse vai buscar as fontes a um CDN.)
    await Promise.all([document.fonts.load("30px Bravura"), document.fonts.load("12px Academico")]);
    return mod;
  });
  return vexPromise;
}

export default function ScoreView({ score, engine, loop, onMeasureClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const measureHighlightRef = useRef<HTMLDivElement>(null);
  /** "measure:tick" → elementos SVG das notas (mãos e pé) nesse instante. */
  const noteElements = useRef(new Map<string, { el: SVGElement; x: number }[]>());
  const [boxes, setBoxes] = useState<MeasureBox[]>([]);
  const boxesRef = useRef<MeasureBox[]>([]);
  const [width, setWidth] = useState(0);

  // Largura disponível (re-desenha ao redimensionar).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry!.contentRect.width);
      setWidth((prev) => (Math.abs(prev - w) > 4 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Desenho da partitura.
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || width === 0) return;
    let cancelled = false;

    loadVexFlow().then((VF) => {
      if (cancelled) return;
      const { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, Annotation, Articulation, Fraction, BarlineType } = VF;
      host.innerHTML = "";
      noteElements.current.clear();

      const [beats, beatValue] = score.timeSignature;
      const perRow = Math.max(1, Math.min(4, Math.floor((width - 10) / MIN_MEASURE_WIDTH)));
      const rows = Math.ceil(score.measures.length / perRow);
      const firstExtra = 50; // clave (+ fórmula no 1º sistema)
      const measureWidth = Math.floor((width - 10 - firstExtra) / perRow);

      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(width, rows * ROW_HEIGHT + 10);
      const ctx = renderer.getContext();
      const newBoxes: MeasureBox[] = [];

      score.measures.forEach((measure, mi) => {
        const row = Math.floor(mi / perRow);
        const col = mi % perRow;
        const isRowStart = col === 0;
        const x = 5 + (isRowStart ? 0 : firstExtra + col * measureWidth);
        const w = measureWidth + (isRowStart ? firstExtra : 0);
        const y = row * ROW_HEIGHT + STAVE_TOP;

        const stave = new Stave(x, y, w);
        if (isRowStart) stave.addClef("percussion");
        if (mi === 0) stave.addTimeSignature(`${beats}/${beatValue}`);
        stave.setMeasure(mi + 1);
        if (mi === score.measures.length - 1) stave.setEndBarType(BarlineType.END);
        stave.setContext(ctx).draw();
        newBoxes.push({ x, y: row * ROW_HEIGHT, width: w, row });

        const notation = measureToNotation(measure, score);
        const build = (items: typeof notation.hands, stemDirection: 1 | -1) =>
          items.map((item) => {
            const note = new StaveNote({
              keys: item.keys,
              duration: item.duration + (item.rest ? "r" : ""),
              dots: item.dots,
              clef: "percussion",
              stemDirection,
            });
            if (item.dots) Dot.buildAndAttach([note], { all: true });
            if (item.open) {
              note.addModifier(new Annotation("o").setVerticalJustification(Annotation.VerticalJustify.TOP));
            }
            if (item.accent) {
              note.addModifier(new Articulation("a>").setPosition(stemDirection === 1 ? 3 : 4));
            }
            return { note, item };
          });

        const hands = build(notation.hands, 1);
        const feet = build(notation.feet, -1);
        const makeVoice = (notes: typeof hands) =>
          new Voice({ numBeats: beats, beatValue })
            .setMode(Voice.Mode.SOFT)
            .addTickables(notes.map((n) => n.note));
        const voices = [makeVoice(hands), makeVoice(feet)];

        // Colchetes agrupados por tempo, com a direção de haste de cada voz.
        const group = [new Fraction(1, beatValue)];
        const beams = [
          ...Beam.generateBeams(hands.map((n) => n.note), { groups: group, stemDirection: 1 }),
          ...Beam.generateBeams(feet.map((n) => n.note), { groups: group, stemDirection: -1 }),
        ];

        new Formatter().joinVoices(voices).format(voices, w - (stave.getNoteStartX() - x) - 15);
        voices.forEach((v) => v.draw(ctx, stave));
        beams.forEach((b) => b.setContext(ctx).draw());

        // Mapa (compasso, tick) → elementos, para o cursor.
        for (const { note, item } of [...hands, ...feet]) {
          if (item.rest) continue;
          const el = note.getSVGElement();
          if (!el) continue;
          const key = `${mi}:${item.tick}`;
          const list = noteElements.current.get(key) ?? [];
          list.push({ el, x: note.getAbsoluteX() });
          noteElements.current.set(key, list);
        }
      });

      boxesRef.current = newBoxes;
      setBoxes(newBoxes);
    });

    return () => {
      cancelled = true;
    };
  }, [score, width]);

  // Cursor sincronizado: reage aos eventos `step` do motor.
  useEffect(() => {
    let active: SVGElement[] = [];
    let lastRow = -1;
    const cursor = cursorRef.current;
    const mHighlight = measureHighlightRef.current;

    return engine.subscribe((ev) => {
      if (ev.type !== "step") return;
      active.forEach((el) => el.classList.remove("is-playing"));
      active = [];
      if (ev.measure < 0) {
        if (cursor) cursor.style.opacity = "0";
        if (mHighlight) mHighlight.style.opacity = "0";
        lastRow = -1;
        return;
      }
      const entries = noteElements.current.get(`${ev.measure}:${ev.tick}`) ?? [];
      for (const { el } of entries) {
        el.classList.add("is-playing");
        active.push(el);
      }
      const box = boxesRef.current[ev.measure];
      if (!box) return;
      if (cursor && entries[0]) {
        cursor.style.opacity = "1";
        cursor.style.transform = `translate(${entries[0].x + 4}px, ${box.y + 12}px)`;
      }
      if (mHighlight) {
        mHighlight.style.opacity = "1";
        mHighlight.style.transform = `translate(${box.x}px, ${box.y + 12}px)`;
        mHighlight.style.width = `${box.width}px`;
      }
      // Rolagem automática: mantém o sistema atual visível.
      const scroller = scrollRef.current;
      if (scroller && box.row !== lastRow) {
        lastRow = box.row;
        const top = box.y - 8;
        if (top < scroller.scrollTop || top + ROW_HEIGHT > scroller.scrollTop + scroller.clientHeight) {
          scroller.scrollTo({ top, behavior: "smooth" });
        }
      }
    });
  }, [engine]);

  return (
    <div
      ref={scrollRef}
      className="score-paper relative max-h-[42vh] overflow-y-auto rounded-xl bg-[#f6f3ec] lg:max-h-[60vh]"
      aria-label={`Partitura: ${score.title}`}
    >
      <div className="relative">
        {/* Faixas de loop por baixo do SVG */}
        {loop.enabled &&
          boxes.map((b, i) =>
            i >= loop.start && i <= loop.end ? (
              <div
                key={i}
                className="pointer-events-none absolute bg-amber-300/30"
                style={{ left: b.x, top: b.y + 12, width: b.width, height: ROW_HEIGHT - 24 }}
              />
            ) : null,
          )}
        <div
          ref={measureHighlightRef}
          className="pointer-events-none absolute left-0 top-0 bg-sky-400/10 opacity-0 transition-transform duration-75"
          style={{ height: ROW_HEIGHT - 24 }}
        />
        <div
          ref={cursorRef}
          className="pointer-events-none absolute left-0 top-0 w-[3px] rounded bg-sky-500/70 opacity-0"
          style={{ height: ROW_HEIGHT - 24 }}
        />
        <div ref={svgHostRef} className="relative" />
        {/* Zonas clicáveis por compasso (escolha de loop) */}
        {onMeasureClick &&
          boxes.map((b, i) => (
            <button
              key={i}
              type="button"
              title={`Compasso ${i + 1} — clique para loop, Shift+clique para estender`}
              aria-label={`Compasso ${i + 1}`}
              className="absolute cursor-pointer rounded hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-sky-500"
              style={{ left: b.x, top: b.y + 12, width: b.width, height: ROW_HEIGHT - 24 }}
              onClick={(e) => onMeasureClick(i, e.shiftKey)}
            />
          ))}
      </div>
    </div>
  );
}
