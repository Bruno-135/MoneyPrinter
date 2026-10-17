import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTimeline, ticksToSeconds, TRANSPORT_PPQ } from "@/lib/audio/timeline";
import {
  type DrumScore,
  DRUM_PIECES,
  measureToNotation,
  MIDI_TO_PIECE,
  midiToScore,
  parseScore,
  PIECE_TO_MIDI,
  scoreToMidi,
  splitDuration,
} from "@/lib/score";

const rock: DrumScore = {
  title: "Teste",
  bpm: 120,
  timeSignature: [4, 4],
  resolution: 16,
  measures: [
    {
      events: [
        { tick: 0, piece: "kick", velocity: 110 },
        { tick: 0, piece: "hihatClosed", velocity: 100 },
        { tick: 4, piece: "snare", velocity: 100 },
        { tick: 6, piece: "hihatOpen", velocity: 90 },
      ],
    },
    { events: [{ tick: 0, piece: "crash", velocity: 120 }] },
  ],
};

describe("mapa MIDI", () => {
  it("usa as notas General MIDI pedidas e é reversível", () => {
    expect(PIECE_TO_MIDI).toEqual({
      kick: 36, snare: 38, hihatClosed: 42, hihatOpen: 46, tom1: 48, tom2: 45, floorTom: 43, crash: 49, ride: 51,
    });
    for (const piece of DRUM_PIECES) expect(MIDI_TO_PIECE[PIECE_TO_MIDI[piece]]).toBe(piece);
  });

  it("midiToScore ainda é um stub", () => {
    expect(() => midiToScore(new Uint8Array())).toThrow(/etapa 4/);
  });
});

describe("scoreToMidi", () => {
  const bytes = scoreToMidi(rock);
  const text = (from: number, len: number) => String.fromCharCode(...bytes.slice(from, from + len));

  it("gera um Standard MIDI File formato 0 com PPQ 480", () => {
    expect(text(0, 4)).toBe("MThd");
    expect([...bytes.slice(8, 14)]).toEqual([0, 0, 0, 1, 0x01, 0xe0]);
    expect(text(14, 4)).toBe("MTrk");
    const len = (bytes[18]! << 24) | (bytes[19]! << 16) | (bytes[20]! << 8) | bytes[21]!;
    expect(bytes.length).toBe(22 + len);
    expect([...bytes.slice(-3)]).toEqual([0xff, 0x2f, 0x00]);
  });

  it("codifica o andamento (500000 µs/semínima a 120 BPM) e note-ons no canal 10", () => {
    const hex = Buffer.from(bytes).toString("hex");
    expect(hex).toContain("ff510307a120");
    expect(hex).toContain("99246e"); // note-on canal 10, nota 36 (bumbo), velocity 110
    expect(hex).toContain("992a64"); // nota 42 (chimbal fechado), velocity 100
  });
});

describe("timeline", () => {
  const tl = buildTimeline(rock);
  it("posiciona compassos depois do slot de contagem, em ticks", () => {
    expect(tl.measureTicks).toBe(TRANSPORT_PPQ * 4);
    expect(tl.steps.map((s) => s.transportTicks)).toEqual([768, 768 + 4 * 48, 768 + 6 * 48, 768 * 2]);
    expect(tl.steps[0]!.notes).toHaveLength(2);
    expect(tl.beats).toHaveLength(3 * 4); // contagem + 2 compassos
  });
  it("a 60 e a 180 BPM a semínima dura 1 s e 1/3 s", () => {
    expect(ticksToSeconds(tl.beatTicks, 60)).toBeCloseTo(1);
    expect(ticksToSeconds(tl.beatTicks, 180)).toBeCloseTo(1 / 3);
  });
});

describe("notação", () => {
  it("divide durações em figuras com ponto", () => {
    expect(splitDuration(4, 16)).toEqual([{ duration: "4", dots: 0, ticks: 4 }]);
    expect(splitDuration(3, 16)).toEqual([{ duration: "8", dots: 1, ticks: 3 }]);
    expect(splitDuration(5, 16).map((p) => p.duration)).toEqual(["4", "16"]);
  });
  it("separa mãos e pé e marca o chimbal aberto", () => {
    const n = measureToNotation(rock.measures[0]!, rock);
    const sum = (items: { duration: string; dots: number }[]) =>
      items.reduce((s, i) => s + (16 / Number(i.duration)) * (i.dots ? 1.5 : 1), 0);
    expect(sum(n.hands)).toBe(16);
    expect(sum(n.feet)).toBe(16);
    expect(n.hands[0]!.keys).toEqual(["g/5/x"]);
    expect(n.hands.find((i) => i.tick === 6)!.open).toBe(true);
    expect(n.feet[0]!.keys).toEqual(["f/4"]);
  });
});

describe("exercícios", () => {
  const dir = join(__dirname, "..", "..", "content", "exercises");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(`${file} é um DrumScore válido`, () => {
      const score = parseScore(JSON.parse(readFileSync(join(dir, file), "utf8")), file);
      expect(score.measures.length).toBeGreaterThan(0);
      for (const m of score.measures) {
        const n = measureToNotation(m, score);
        expect(n.hands.length).toBeGreaterThan(0);
      }
    });
  }
  it("parseScore rejeita peças desconhecidas", () => {
    expect(() =>
      parseScore({ ...rock, measures: [{ events: [{ tick: 0, piece: "cowbell", velocity: 100 }] }] }),
    ).toThrow(/cowbell/);
  });
});
