import Link from "next/link";
import ExerciseCatalog, { type CatalogItem } from "@/components/ExerciseCatalog";
import { listExercises } from "@/lib/content/exercises";

export default function HomePage() {
  // Só os campos da lista vão para o navegador (não as notas de cada exercício).
  const items: CatalogItem[] = listExercises().map((ex) => ({
    id: ex.id,
    title: ex.title,
    description: ex.description,
    level: ex.level ?? "iniciante",
    category: ex.category ?? "groove",
    style: ex.style ?? "Outros",
    bpm: ex.bpm,
    goalBpm: ex.goalBpm,
    timeSignature: ex.timeSignature,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Escola de bateria</h1>
        <p className="mt-1 text-zinc-400">
          Ritmos, rudimentos, viradas e leitura, do básico ao avançado. Ouça, diminua o andamento e toque junto.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
      <Link
        href="/aprender"
        className="flex flex-col gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 transition-colors hover:bg-emerald-500/15"
      >
        <span className="font-semibold text-emerald-200">Não sabe ler partitura? Comece aqui →</span>
        <span className="text-sm text-zinc-400">9 aulas curtas: onde fica cada peça, figuras, pausas, compasso e um teste.</span>
      </Link>
      <Link
        href="/musica"
        className="flex flex-col gap-1 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 transition-colors hover:bg-sky-500/15"
      >
        <span className="font-semibold text-sky-200">Tocar junto com uma música →</span>
        <span className="text-sm text-zinc-400">
          Cole um link do YouTube ou abra um arquivo: loop de trechos, velocidade reduzida e marcações.
        </span>
      </Link>
      </div>
      <ExerciseCatalog items={items} />
    </div>
  );
}
