/**
 * Vozes do kit: samples WAV (preferido) ou síntese Tone.js (fallback).
 *
 * As duas implementações recebem o MESMO `time` de áudio vindo do Transport,
 * por isso a sincronia não depende de qual delas está ativa.
 */
import { DRUM_PIECES, type DrumPiece } from "@/lib/score";

type ToneModule = typeof import("tone");

export interface KitVoices {
  readonly kind: "samples" | "synth";
  /** Toca `piece` no instante `time` (segundos do AudioContext). */
  trigger(piece: DrumPiece, time: number, velocity: number): void;
  dispose(): void;
}

/** Curva velocity → ganho: mais natural que linear para o ouvido. */
const velocityToGain = (velocity: number) => Math.pow(Math.min(127, Math.max(1, velocity)) / 127, 1.6);

/** Volume relativo de cada peça na mistura (dB). */
const PIECE_LEVEL_DB: Record<DrumPiece, number> = {
  kick: 0,
  snare: -2,
  hihatClosed: -8,
  hihatOpen: -9,
  tom1: -3,
  tom2: -3,
  floorTom: -2,
  crash: -8,
  ride: -9,
};

export async function createKit(Tone: ToneModule, baseUrl = "/samples/"): Promise<KitVoices> {
  try {
    return await createSampleKit(Tone, baseUrl);
  } catch (err) {
    console.warn("[BateraLab] samples indisponíveis, a usar kit sintetizado:", err);
    return createSynthKit(Tone);
  }
}

// --- Kit de samples ----------------------------------------------------------

async function createSampleKit(Tone: ToneModule, baseUrl: string): Promise<KitVoices> {
  const urls = Object.fromEntries(DRUM_PIECES.map((p) => [p, `${p}.wav`]));
  const buffers = await new Promise<InstanceType<ToneModule["ToneAudioBuffers"]>>((resolve, reject) => {
    const b: InstanceType<ToneModule["ToneAudioBuffers"]> = new Tone.ToneAudioBuffers({
      urls,
      baseUrl,
      onload: () => resolve(b),
      onerror: reject,
    });
  });

  const channels = Object.fromEntries(
    DRUM_PIECES.map((p) => [p, new Tone.Volume(PIECE_LEVEL_DB[p]).toDestination()]),
  ) as Record<DrumPiece, InstanceType<ToneModule["Volume"]>>;

  // Chimbais abertos ainda a soar — o chimbal fechado corta-os (choke).
  const openHats = new Set<{ source: InstanceType<ToneModule["ToneBufferSource"]>; start: number }>();

  return {
    kind: "samples",
    trigger(piece, time, velocity) {
      if (piece === "hihatClosed") {
        // Choke: o pé fecha o chimbal → qualquer chimbal aberto anterior é
        // cortado exatamente no instante do fechado (com fade curto, sem clique).
        for (const hat of openHats) {
          if (hat.start < time) hat.source.stop(time);
        }
      }
      // ToneBufferSource é descartável: uma por batida permite sobreposição natural.
      const source = new Tone.ToneBufferSource(buffers.get(piece)).connect(channels[piece]);
      if (piece === "hihatOpen") {
        source.fadeOut = 0.03;
        const entry = { source, start: time };
        openHats.add(entry);
        source.onended = () => {
          openHats.delete(entry);
          source.dispose();
        };
      } else {
        source.onended = () => source.dispose();
      }
      source.start(time, 0, undefined, velocityToGain(velocity));
    },
    dispose() {
      buffers.dispose();
      Object.values(channels).forEach((c) => c.dispose());
    },
  };
}

// --- Kit sintetizado (fallback) ---------------------------------------------

function createSynthKit(Tone: ToneModule): KitVoices {
  const outputs: { dispose(): unknown }[] = [];
  const out = (piece: DrumPiece) => {
    const volume = new Tone.Volume(PIECE_LEVEL_DB[piece]).toDestination();
    outputs.push(volume);
    return volume;
  };

  const membrane = (piece: DrumPiece, pitchDecay: number, decay: number) =>
    new Tone.MembraneSynth({
      pitchDecay,
      octaves: 6,
      envelope: { attack: 0.001, decay, sustain: 0, release: 0.05 },
    }).connect(out(piece));

  const metal = (piece: DrumPiece, frequency: number, decay: number, resonance: number) => {
    const synth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay, sustain: 0, release: 0.03 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance,
      octaves: 1.5,
    }).connect(out(piece));
    synth.frequency.value = frequency;
    return synth;
  };

  const kick = membrane("kick", 0.05, 0.4);
  const toms = {
    tom1: { synth: membrane("tom1", 0.03, 0.35), note: "G2" },
    tom2: { synth: membrane("tom2", 0.03, 0.4), note: "D2" },
    floorTom: { synth: membrane("floorTom", 0.03, 0.5), note: "A1" },
  };
  const snareFilter = new Tone.Filter(1200, "highpass").connect(out("snare"));
  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
  }).connect(snareFilter);
  const hihatClosed = metal("hihatClosed", 400, 0.05, 6000);
  const hihatOpen = metal("hihatOpen", 400, 0.6, 6000);
  const crash = metal("crash", 300, 1.6, 5000);
  const ride = metal("ride", 500, 1.0, 3500);

  // Os sintetizadores Tone são monofónicos e exigem tempos de início
  // estritamente crescentes; empurramos 1 ms quando dois batidas coincidem.
  const lastTime = new Map<DrumPiece, number>();
  const safeTime = (piece: DrumPiece, time: number) => {
    const prev = lastTime.get(piece) ?? -1;
    const t = time <= prev ? prev + 0.001 : time;
    lastTime.set(piece, t);
    return t;
  };

  const all = [kick, snare, snareFilter, hihatClosed, hihatOpen, crash, ride, ...Object.values(toms).map((t) => t.synth)];

  return {
    kind: "synth",
    trigger(piece, rawTime, velocity) {
      const time = safeTime(piece, rawTime);
      const v = velocityToGain(velocity);
      switch (piece) {
        case "kick":
          kick.triggerAttackRelease("C1", "8n", time, v);
          break;
        case "snare":
          snare.triggerAttackRelease("16n", time, v);
          break;
        case "hihatClosed":
          // Choke do chimbal aberto: release rápido no mesmo instante.
          hihatOpen.triggerRelease(time);
          hihatClosed.triggerAttackRelease("32n", time, v);
          break;
        case "hihatOpen":
          hihatOpen.triggerAttack(time, v);
          break;
        case "crash":
          crash.triggerAttackRelease("1n", time, v);
          break;
        case "ride":
          ride.triggerAttackRelease("4n", time, v);
          break;
        default: {
          const tom = toms[piece];
          tom.synth.triggerAttackRelease(tom.note, "8n", time, v);
        }
      }
    },
    dispose() {
      [...all, ...outputs].forEach((n) => n.dispose());
    },
  };
}
