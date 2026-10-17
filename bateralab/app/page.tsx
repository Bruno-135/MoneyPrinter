import Link from "next/link";
import { listExercises } from "@/lib/content/exercises";

export default function HomePage() {
  const exercises = listExercises();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Exercícios</h1>
        <p className="mt-1 text-zinc-400">Escolha um groove, ouça, diminua o andamento e toque junto.</p>
      </div>
      <Link
        href="/musica"
        className="flex flex-col gap-1 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 transition-colors hover:bg-sky-500/15"
      >
        <span className="font-semibold text-sky-200">Tocar junto com uma música →</span>
        <span className="text-sm text-zinc-400">
          Cole um link do YouTube ou abra um arquivo: loop de trechos, velocidade reduzida e marcações.
        </span>
      </Link>
      <ul className="grid gap-3 sm:grid-cols-2">
        {exercises.map((ex, i) => (
          <li key={ex.id}>
            <Link
              href={`/exercicios/${ex.id}`}
              className="flex h-full flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-sky-500/60 hover:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold">
                  <span className="mr-2 font-mono text-sky-400">{String(i + 1).padStart(2, "0")}</span>
                  {ex.title}
                </h2>
                <span className="whitespace-nowrap font-mono text-xs text-zinc-500">
                  {ex.bpm} BPM · {ex.timeSignature.join("/")} · {ex.measures.length} comp.
                </span>
              </div>
              {ex.description && <p className="text-sm text-zinc-400">{ex.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
