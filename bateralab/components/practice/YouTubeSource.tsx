"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaController } from "@/lib/practice/media";
import { pushRecent } from "@/lib/practice/storage";
import { createYouTubeController } from "@/lib/practice/youtube";
import PracticePlayer from "./PracticePlayer";

/** Vídeo do YouTube (player oficial) + controles de estudo. */
export default function YouTubeSource({ videoId, start, url }: { videoId: string; start: number; url: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MediaController | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = hostRef.current;
    if (!wrapper) return;
    // O player substitui o elemento recebido; criamos um filho descartável.
    const host = document.createElement("div");
    wrapper.appendChild(host);
    let disposed = false;
    let created: (MediaController & { getTitle(): string }) | null = null;

    createYouTubeController(host, videoId, { start, onError: setError })
      .then((c) => {
        if (disposed) return c.dispose();
        created = c;
        setController(c);
        pushRecent({ key: `yt:${videoId}`, kind: "youtube", ref: url, title: c.getTitle() || url });
      })
      .catch((e: Error) => !disposed && setError(e.message));

    return () => {
      disposed = true;
      created?.dispose();
      setController(null);
      wrapper.innerHTML = "";
    };
  }, [videoId, start, url]);

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <div ref={hostRef} className="h-full w-full [&>*]:h-full [&>*]:w-full" />
      </div>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {controller ? (
        <PracticePlayer controller={controller} sourceKey={`yt:${videoId}`} />
      ) : (
        !error && <p className="text-sm text-zinc-500">Carregando o player do YouTube…</p>
      )}
      <p className="text-xs text-zinc-500">
        Pelo link do YouTube dá para fazer loop, mudar a velocidade e marcar trechos. Para separar a bateria ou gerar a
        partitura é preciso enviar o arquivo de áudio (aba “Arquivo”).
      </p>
    </div>
  );
}
