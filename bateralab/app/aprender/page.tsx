import type { Metadata } from "next";
import Link from "next/link";
import { LESSONS } from "@/lib/lessons";

export const metadata: Metadata = { title: "Aprender a ler partitura" };

export default function LessonsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Aprender a ler partitura</h1>
        <p className="mt-1 text-zinc-400">
          {LESSONS.length} aulas curtas, com exemplos para ouvir e ver na bateria. Comece pela primeira — leva uns 20
          minutos no total.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {LESSONS.map((lesson, i) => (
          <li key={lesson.slug}>
            <Link
              href={`/aprender/${lesson.slug}`}
              className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-sky-500/60"
            >
              <span className="font-mono text-lg text-sky-400">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-semibold">{lesson.title}</span>
                <span className="text-sm text-zinc-400">{lesson.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
