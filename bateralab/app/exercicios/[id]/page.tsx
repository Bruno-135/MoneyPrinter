import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudyScreen from "@/components/StudyScreen";
import { getExercise, listExercises } from "@/lib/content/exercises";
import { CATEGORY_LABEL, LEVEL_LABEL } from "@/lib/score/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return listExercises().map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/exercicios/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getExercise(id)?.title ?? "Exercício" };
}

export default async function ExercisePage({ params }: PageProps<"/exercicios/[id]">) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Escola
        </Link>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{exercise.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-400">
          {exercise.level && <span className="rounded-full border border-zinc-700 px-2 py-0.5">{LEVEL_LABEL[exercise.level]}</span>}
          {exercise.category && <span className="rounded-full border border-zinc-700 px-2 py-0.5">{CATEGORY_LABEL[exercise.category]}</span>}
          {exercise.style && <span className="rounded-full border border-zinc-700 px-2 py-0.5">{exercise.style}</span>}
          {exercise.goalBpm && (
            <span className="rounded-full border border-sky-500/40 px-2 py-0.5 text-sky-300">
              Meta: {exercise.goalBpm} BPM
            </span>
          )}
        </div>
        {exercise.description && <p className="mt-2 text-sm text-zinc-400">{exercise.description}</p>}
      </div>
      <StudyScreen key={exercise.id} score={exercise} />
      {exercise.tips && exercise.tips.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Dicas de estudo</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {exercise.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
