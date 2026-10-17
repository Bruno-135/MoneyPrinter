/**
 * Tocador de arquivo local (MP3, WAV, M4A, OGG…). O arquivo nunca sai do
 * computador do usuário: é lido com URL.createObjectURL e tocado num <audio>.
 * `preservesPitch` mantém o tom ao mudar a velocidade.
 */
import { FINE_RATES, type MediaController } from "./media";

export function createAudioFileController(file: File): MediaController & { url: string } {
  const url = URL.createObjectURL(file);
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.preservesPitch = true;

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const events = ["play", "pause", "ended", "loadedmetadata", "durationchange", "ratechange", "seeked"] as const;
  events.forEach((e) => audio.addEventListener(e, notify));

  return {
    kind: "file",
    url,
    play: () => void audio.play().catch(() => {}),
    pause: () => audio.pause(),
    isPlaying: () => !audio.paused && !audio.ended,
    getTime: () => audio.currentTime,
    getDuration: () => (Number.isFinite(audio.duration) ? audio.duration : 0),
    seek(seconds) {
      audio.currentTime = Math.min(Math.max(0, seconds), audio.duration || seconds);
    },
    setRate(rate) {
      audio.playbackRate = rate;
    },
    getRate: () => audio.playbackRate,
    getRates: () => FINE_RATES,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      audio.pause();
      events.forEach((e) => audio.removeEventListener(e, notify));
      listeners.clear();
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Calcula a forma de onda (pico por coluna, 0–1) para desenhar a timeline.
 * Usa um AudioContext temporário só para decodificar.
 */
export async function computePeaks(file: File, columns = 1600): Promise<Float32Array> {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const per = Math.max(1, Math.floor(buffer.length / columns));
    const peaks = new Float32Array(columns);
    let max = 0;
    for (let col = 0; col < columns; col++) {
      const from = col * per;
      const to = Math.min(buffer.length, from + per);
      let peak = 0;
      // Amostragem a cada 4 amostras: suficiente para o desenho e 4× mais rápido.
      for (let i = from; i < to; i += 4) {
        for (const data of channels) {
          const v = Math.abs(data[i]!);
          if (v > peak) peak = v;
        }
      }
      peaks[col] = peak;
      if (peak > max) max = peak;
    }
    if (max > 0) for (let i = 0; i < columns; i++) peaks[i]! /= max;
    return peaks;
  } finally {
    void ctx.close();
  }
}
