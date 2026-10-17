"use client";

import { useEffect, useState } from "react";
import { listRecent, type RecentSource } from "@/lib/practice/storage";
import { parseYouTubeUrl } from "@/lib/practice/youtube";
import FileSource from "./FileSource";
import YouTubeSource from "./YouTubeSource";

type Mode = "youtube" | "file";

export default function MusicPracticeScreen({ initialMode = "youtube" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [link, setLink] = useState("");
  const [video, setVideo] = useState<{ id: string; start: number; url: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<RecentSource[]>([]);

  // localStorage só existe no navegador: lê depois de montar (evita diferença com o HTML do servidor).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRecent(listRecent()), [video, file]);

  const openLink = (value: string) => {
    const parsed = parseYouTubeUrl(value);
    if (!parsed) {
      setLinkError("Não reconheci esse link. Cole um endereço do YouTube, ex.: https://www.youtube.com/watch?v=…");
      return;
    }
    setLinkError(null);
    setVideo({ ...parsed, url: value.trim() });
  };

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/") && !/\.(mp3|wav|m4a|aac|ogg|flac|mp4)$/i.test(f.name)) {
      return;
    }
    setFile(f);
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === m ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="flex w-fit gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
        {tab("youtube", "Link do YouTube")}
        {tab("file", "Arquivo")}
      </div>

      {mode === "youtube" ? (
        <>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              openLink(link);
            }}
          >
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (parseYouTubeUrl(text)) {
                  e.preventDefault();
                  setLink(text);
                  openLink(text);
                }
              }}
              placeholder="Cole aqui o link do YouTube"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600"
              aria-label="Link do YouTube"
            />
            <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-sky-400">
              Abrir
            </button>
          </form>
          {linkError && <p className="text-sm text-red-300">{linkError}</p>}
          {video ? (
            <YouTubeSource key={`${video.id}:${video.start}`} videoId={video.id} start={video.start} url={video.url} />
          ) : (
            <Recent
              items={recent.filter((r) => r.kind === "youtube")}
              onPick={(r) => {
                setLink(r.ref);
                openLink(r.ref);
              }}
            />
          )}
        </>
      ) : (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-sky-400 bg-sky-500/10" : "border-zinc-700 hover:border-zinc-500"}`}
          >
            <span className="font-medium">{file ? "Trocar música" : "Escolha uma música ou arraste para aqui"}</span>
            <span className="text-xs text-zinc-500">MP3, WAV, M4A, OGG ou FLAC</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          {file && <FileSource file={file} />}
        </>
      )}
    </div>
  );
}

function Recent({ items, onPick }: { items: RecentSource[]; onPick: (r: RecentSource) => void }) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">
        Cole o link de qualquer música no YouTube para estudar com loop, velocidade reduzida e marcações.
      </p>
    );
  }
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recentes</h2>
      <ul className="flex flex-col gap-1">
        {items.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => onPick(r)} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900">
              {r.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
