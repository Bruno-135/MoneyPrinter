/**
 * Interface comum aos "tocadores" de música da tela Tocar junto.
 * O YouTube (IFrame API) e o arquivo local (<audio>) implementam-na, e os
 * controles de estudo (loop A–B, velocidade, marcações) só falam com ela.
 */
export interface MediaController {
  readonly kind: "youtube" | "file";
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  /** Posição atual em segundos. */
  getTime(): number;
  /** Duração em segundos (0 enquanto desconhecida). */
  getDuration(): number;
  seek(seconds: number): void;
  /** Velocidade (1 = normal). O tom é preservado nos dois tocadores. */
  setRate(rate: number): void;
  getRate(): number;
  /** Velocidades aceitas, em ordem crescente. */
  getRates(): number[];
  /** Avisa mudanças de estado (play/pause/fim/pronto). */
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export function formatTime(seconds: number, withTenths = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const whole = Math.floor(s);
  const base = `${m}:${String(whole).padStart(2, "0")}`;
  return withTenths ? `${base},${Math.floor((s - whole) * 10)}` : base;
}

/** Faixa de velocidades fina usada quando o tocador aceita qualquer valor. */
export const FINE_RATES = Array.from({ length: 26 }, (_, i) => Math.round((0.25 + i * 0.05) * 100) / 100);
