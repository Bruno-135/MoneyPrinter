import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enviar música" };

export default function UploadPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
        Em breve
      </span>
      <h1 className="text-2xl font-bold">Enviar uma música</h1>
      <p className="text-zinc-400">
        Aqui vai ser possível enviar uma música, separar a bateria do resto da mistura e gerar a partitura
        automaticamente para estudar no BateraLab.
      </p>
    </div>
  );
}
