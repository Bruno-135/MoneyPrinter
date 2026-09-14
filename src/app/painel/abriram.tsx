import Link from 'next/link';
import type { AbriuAPagina } from '@/lib/sites/atividade';
import { O_QUE_FEZ } from '@/lib/sites/atividade';
import { haQuantoTempo } from '@/components/quando';

/**
 * Quem abriu a página que lhe mandaste, no painel.
 *
 * É a primeira coisa a ler ao abrir o painel num dia de trabalho, e por isso
 * fica em cima. Um comerciante que abriu a proposta esta manhã já sabe do que
 * se trata e já mostrou interesse — telefonar-lhe não é uma chamada fria, é
 * continuar uma conversa que ele começou.
 */
export function Abriram({ quem }: { quem: readonly AbriuAPagina[] }) {
  if (quem.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-emerald-600/30 bg-emerald-500/[0.06] p-5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-sm font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
          Abriram a tua página
        </h2>
        <p className="text-sm opacity-60">Liga a estes primeiro. Já sabem do que se trata.</p>
      </div>

      <ul className="flex flex-col gap-2">
        {quem.map((q) => (
          <li key={q.businessId}>
            <Link
              href={`/painel/comercio/${q.businessId}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
            >
              <span className="font-medium underline-offset-4 hover:underline">{q.nome}</span>
              <span className="opacity-55">{haQuantoTempo(q.quando)}</span>
              {q.fez && (
                <span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {O_QUE_FEZ[q.fez]}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
