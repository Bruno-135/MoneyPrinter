import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudyScreen from "@/components/StudyScreen";
import { getExercise, listExercises } from "@/lib/content/exercises";

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
          ← Exercícios
        </Link>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{exercise.title}</h1>
        {exercise.description && <p className="mt-1 text-sm text-zinc-400">{exercise.description}</p>}
      </div>
      <StudyScreen key={exercise.id} score={exercise} />
    </div>
  );
}
