import type { Metadata } from "next";
import MusicPracticeScreen from "@/components/practice/MusicPracticeScreen";

export const metadata: Metadata = { title: "Tocar junto" };

export default async function MusicPage({ searchParams }: PageProps<"/musica">) {
  const { modo } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Tocar junto</h1>
        <p className="mt-1 text-zinc-400">
          Abra uma música pelo link do YouTube ou de um arquivo e estude por partes: loop de trechos, velocidade reduzida
          e marcações.
        </p>
      </div>
      <MusicPracticeScreen initialMode={modo === "arquivo" ? "file" : "youtube"} />
    </div>
  );
}
