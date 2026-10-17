import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LESSON_CONTENT } from "@/components/lessons/content";
import { LESSONS } from "@/lib/lessons";

export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/aprender/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: LESSONS.find((l) => l.slug === slug)?.title ?? "Aula" };
}

export default async function LessonPage({ params }: PageProps<"/aprender/[slug]">) {
  const { slug } = await params;
  const index = LESSONS.findIndex((l) => l.slug === slug);
  const lesson = LESSONS[index];
  if (!lesson) notFound();
  const Content = LESSON_CONTENT[lesson.slug];
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/aprender" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Aulas de leitura
      </Link>
      <p className="mt-3 font-mono text-xs text-sky-400">
        Aula {index + 1} de {LESSONS.length}
      </p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
      <Content />
      <nav className="mt-10 flex justify-between gap-4 border-t border-zinc-800 pt-4 text-sm">
        {prev ? (
          <Link href={`/aprender/${prev.slug}`} className="text-zinc-400 hover:text-zinc-100">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/aprender/${next.slug}`} className="text-right font-medium text-sky-300 hover:text-sky-200">
            {next.title} →
          </Link>
        ) : (
          <Link href="/" className="text-right font-medium text-sky-300 hover:text-sky-200">
            Ir para os exercícios →
          </Link>
        )}
      </nav>
    </article>
  );
}
