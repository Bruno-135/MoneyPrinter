import { type DrumPiece, type DrumScore, ticksPerMeasure } from "./types";

/** Nota General MIDI (canal 10) de cada peça. */
export const PIECE_TO_MIDI: Record<DrumPiece, number> = {
  kick: 36,
  snare: 38,
  hihatClosed: 42,
  hihatOpen: 46,
  tom1: 48,
  tom2: 45,
  floorTom: 43,
  crash: 49,
  ride: 51,
};

/**
 * Nota MIDI → peça. Além das notas canónicas acima, aceita as variantes GM
 * mais comuns que baterias eletrónicas e arquivos MIDI usam, para que tudo
 * caia numa das 9 peças do kit.
 */
export const MIDI_TO_PIECE: Record<number, DrumPiece> = {
  35: "kick", // Acoustic Bass Drum
  36: "kick",
  37: "snare", // Side Stick
  38: "snare",
  39: "snare", // Hand Clap
  40: "snare", // Electric Snare
  41: "floorTom", // Low Floor Tom
  42: "hihatClosed",
  43: "floorTom",
  44: "hihatClosed", // Pedal Hi-Hat
  45: "tom2",
  46: "hihatOpen",
  47: "tom2", // Low-Mid Tom
  48: "tom1",
  49: "crash",
  50: "tom1", // High Tom
  51: "ride",
  52: "crash", // Chinese Cymbal
  53: "ride", // Ride Bell
  55: "crash", // Splash
  57: "crash", // Crash 2
  59: "ride", // Ride 2
};

export function midiNoteToPiece(note: number): DrumPiece | undefined {
  return MIDI_TO_PIECE[note];
}

/** Resolução temporal do arquivo MIDI exportado (ticks por semínima). */
export const MIDI_PPQ = 480;
const DRUM_CHANNEL = 9; // canal 10 em numeração 1-based

/**
 * Converte um DrumScore num arquivo Standard MIDI (formato 0, canal 10).
 * Útil para exportar exercícios e, na etapa de transcrição, para comparar
 * o resultado do ADTOF com a referência.
 */
export function scoreToMidi(score: DrumScore): Uint8Array {
  const midiTicksPerScoreTick = (MIDI_PPQ * 4) / score.resolution;
  const measureLength = ticksPerMeasure(score) * midiTicksPerScoreTick;
  // Duração das notas: uma célula da grade (a bateria não sustenta notas,
  // mas um note-off é obrigatório).
  const noteLength = Math.max(1, Math.round(midiTicksPerScoreTick * 0.9));

  type TimedEvent = { time: number; order: number; bytes: number[] };
  const events: TimedEvent[] = [];

  // Meta-eventos no tempo 0: nome, andamento e fórmula de compasso.
  const titleBytes = Array.from(new TextEncoder().encode(score.title));
  events.push({ time: 0, order: 0, bytes: [0xff, 0x03, ...varLen(titleBytes.length), ...titleBytes] });
  const usPerQuarter = Math.round(60_000_000 / score.bpm);
  events.push({
    time: 0,
    order: 0,
    bytes: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff],
  });
  const [num, den] = score.timeSignature;
  events.push({ time: 0, order: 0, bytes: [0xff, 0x58, 0x04, num, Math.log2(den), 24, 8] });

  score.measures.forEach((measure, mi) => {
    for (const ev of measure.events) {
      const note = PIECE_TO_MIDI[ev.piece];
      const start = Math.round(mi * measureLength + ev.tick * midiTicksPerScoreTick);
      const velocity = Math.min(127, Math.max(1, Math.round(ev.velocity)));
      events.push({ time: start, order: 2, bytes: [0x90 | DRUM_CHANNEL, note, velocity] });
      // order 1: no mesmo instante, note-offs saem antes dos note-ons.
      events.push({ time: start + noteLength, order: 1, bytes: [0x80 | DRUM_CHANNEL, note, 0] });
    }
  });

  events.sort((a, b) => a.time - b.time || a.order - b.order);
  const endTime = Math.max(score.measures.length * measureLength, events.at(-1)?.time ?? 0);

  const track: number[] = [];
  let last = 0;
  for (const ev of events) {
    track.push(...varLen(ev.time - last), ...ev.bytes);
    last = ev.time;
  }
  track.push(...varLen(endTime - last), 0xff, 0x2f, 0x00); // End of Track

  const header = [
    ...ascii("MThd"), ...u32(6),
    ...u16(0), // formato 0
    ...u16(1), // uma faixa
    ...u16(MIDI_PPQ),
  ];
  return new Uint8Array([...header, ...ascii("MTrk"), ...u32(track.length), ...track]);
}

/**
 * Converte um arquivo MIDI de bateria num DrumScore.
 *
 * TODO (etapa 4 — transcrição automática):
 *  1. Ler o cabeçalho MThd (formato 0/1, PPQ) e todas as faixas MTrk
 *     (delta-times em quantidade de comprimento variável, running status).
 *  2. Ler tempo (FF 51) e fórmula de compasso (FF 58); usar o primeiro como `bpm`.
 *  3. Coletar os note-on com velocity > 0 do canal 10 (ou de todos os canais,
 *     se o arquivo vier do ADTOF sem canal definido) e mapear com
 *     `midiNoteToPiece()`; ignorar notas sem mapeamento.
 *  4. Quantizar cada onset para a grade `resolution` (arredondar ao tick mais
 *     próximo) e partir em compassos com `ticksPerMeasure()`.
 *  5. Remover duplicados (mesma peça no mesmo tick → manter a maior velocity).
 *  6. Passar o resultado por `parseScore()` antes de devolver.
 */
export function midiToScore(
  data: Uint8Array,
  options: { title?: string; resolution?: number } = {},
): DrumScore {
  void data;
  void options;
  throw new Error("midiToScore ainda não implementado (etapa 4: transcrição automática)");
}

// --- utilitários binários -------------------------------------------------

function varLen(value: number): number[] {
  let v = Math.max(0, Math.floor(value));
  const bytes = [v & 0x7f];
  while ((v >>= 7) > 0) bytes.unshift((v & 0x7f) | 0x80);
  return bytes;
}

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
