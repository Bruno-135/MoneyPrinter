"use client";

import { useEffect, useState } from "react";
import { computePeaks, createAudioFileController } from "@/lib/practice/audio-file";
import type { MediaController } from "@/lib/practice/media";
import { pushRecent } from "@/lib/practice/storage";
import PracticePlayer from "./PracticePlayer";

/** Chave estável por arquivo: nome + tamanho (para lembrar loop e marcações). */
export const fileKey = (file: File) => `file:${file.name}:${file.size}`;

/** Arquivo de áudio local + forma de onda + controles de estudo. */
export default function FileSource({ file }: { file: File }) {
  const [controller, setController] = useState<MediaController | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = createAudioFileController(file);
    // O tocador é um recurso externo (elemento <audio>) criado e destruído com o arquivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setController(c);
    setPeaks(null);
    setError(null);
    pushRecent({ key: fileKey(file), kind: "file", ref: file.name, title: file.name });
    let cancelled = false;
    computePeaks(file)
      .then((p) => !cancelled && setPeaks(p))
      .catch(() => !cancelled && setError("Não foi possível ler este arquivo. Use MP3, WAV, M4A ou OGG."));
    return () => {
      cancelled = true;
      c.dispose();
    };
  }, [file]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-sm text-zinc-300" title={file.name}>
          🎵 {file.name}
        </p>
        <button
          type="button"
          disabled
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500"
          title="Precisa de um servidor de processamento (etapa seguinte)"
        >
          Separar bateria — em breve
        </button>
      </div>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {controller && <PracticePlayer key={fileKey(file)} controller={controller} sourceKey={fileKey(file)} peaks={peaks} />}
      <p className="text-xs text-zinc-500">O arquivo é tocado no seu navegador e não é enviado para nenhum servidor.</p>
    </div>
  );
}
