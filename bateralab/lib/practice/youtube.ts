/**
 * Integração com o player oficial do YouTube (IFrame Player API).
 *
 * Só tocamos o vídeo pelo player oficial — não baixamos nem processamos o
 * áudio (os termos do YouTube não permitem). Por isso, a partir de um link,
 * dá para fazer loop, mudar a velocidade e navegar, mas não separar a bateria.
 */
import type { MediaController } from "./media";

/** Extrai o ID (11 caracteres) e o tempo inicial de um link do YouTube. */
export function parseYouTubeUrl(input: string): { id: string; start: number } | null {
  const text = input.trim();
  if (/^[\w-]{11}$/.test(text)) return { id: text, start: 0 };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      id = m?.[1] ?? null;
    }
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return { id, start: parseStart(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

/** "90", "90s", "1m30s", "1h2m3s" → segundos. */
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

// --- Tipos mínimos da IFrame API (evita dependência extra) ------------------

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  getVideoData?(): { title?: string };
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onPlaybackRateChange?: () => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const BUFFERING = 3;

let apiPromise: Promise<YTNamespace> | null = null;
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Não foi possível carregar o player do YouTube."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** Mensagem legível para os códigos de erro do player. */
export function youTubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "Link inválido.";
    case 5:
      return "O navegador não conseguiu tocar este vídeo.";
    case 100:
      return "Vídeo não encontrado (removido ou privado).";
    case 101:
    case 150:
      return "O dono deste vídeo não permite que ele seja tocado fora do YouTube. Tente outra versão da música.";
    default:
      return `Erro do player do YouTube (${code}).`;
  }
}

/**
 * Cria o player dentro de `host` e devolve o controlador quando estiver pronto.
 *
 * Precisão do loop: `getCurrentTime()` do iframe só é atualizado a cada
 * mensagem do player (dezenas a centenas de ms). Para o loop A–B não passar
 * do ponto B, extrapolamos a posição com o relógio local enquanto toca.
 */
export async function createYouTubeController(
  host: HTMLElement,
  videoId: string,
  options: { start?: number; onError?: (message: string) => void } = {},
): Promise<MediaController & { getTitle(): string }> {
  const YT = await loadYouTubeApi();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  let player!: YTPlayer;
  let lastReported = -1;
  let anchorTime = 0;
  let anchorClock = 0;

  await new Promise<void>((resolve) => {
    player = new YT.Player(host, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(options.start ?? 0) },
      events: {
        onReady: () => resolve(),
        onStateChange: () => {
          resetAnchor();
          notify();
        },
        onPlaybackRateChange: () => {
          resetAnchor();
          notify();
        },
        onError: (e) => options.onError?.(youTubeErrorMessage(e.data)),
      },
    });
  });

  function resetAnchor() {
    anchorTime = player.getCurrentTime();
    anchorClock = performance.now();
    lastReported = anchorTime;
  }

  const isPlaying = () => player.getPlayerState() === PLAYING;

  return {
    kind: "youtube",
    play: () => player.playVideo(),
    pause: () => player.pauseVideo(),
    isPlaying,
    getTime() {
      const reported = player.getCurrentTime();
      if (reported !== lastReported) {
        lastReported = reported;
        anchorTime = reported;
        anchorClock = performance.now();
      }
      if (!isPlaying() || player.getPlayerState() === BUFFERING) return reported;
      const elapsed = ((performance.now() - anchorClock) / 1000) * player.getPlaybackRate();
      // Nunca extrapolar mais de 1 s (evita saltos se o iframe congelar).
      return anchorTime + Math.min(elapsed, 1);
    },
    getDuration: () => player.getDuration() || 0,
    seek(seconds) {
      player.seekTo(Math.max(0, seconds), true);
      anchorTime = Math.max(0, seconds);
      anchorClock = performance.now();
      lastReported = -1;
    },
    setRate: (rate) => player.setPlaybackRate(rate),
    getRate: () => player.getPlaybackRate(),
    getRates: () => {
      const rates = player.getAvailablePlaybackRates();
      return rates.length ? [...rates].sort((a, b) => a - b) : [1];
    },
    getTitle: () => player.getVideoData?.().title ?? "",
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      player.destroy();
    },
  };
}
