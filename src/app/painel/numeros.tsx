import Link from 'next/link';
import type { Route } from 'next';

/**
 * A fila de números por cima da tabela.
 *
 * Não é enfeite: é a única parte do painel que responde sem se ler nada. Uma
 * tabela de duzentas linhas diz quem há; estes cinco números dizem em que pé
 * está o trabalho — quantos faltam contactar, quantos estão em conversa,
 * quantos já fecharam.
 *
 * Cada número é um link que põe o respetivo filtro na tabela em baixo. Um
 * número que não se pode abrir obriga a ir procurar à mão o que ele conta, e
 * então mais valia não estar lá.
 *
 * Contam-se sempre dentro da procura escolhida e FORA dos filtros das colunas.
 * Se acompanhassem os funis, carregar em "Sem site" mudava o próprio número em
 * que se carregou, e a fila deixava de ser um ponto de referência para passar a
 * ser mais um espelho da tabela.
 */

export interface Numero {
  label: string;
  valor: number;
  href: Route;
  /** Classes da cor do valor. Vazio = a cor normal do texto. */
  tom?: string;
}

export function Numeros({ numeros }: { numeros: readonly Numero[] }) {
  if (numeros.every((n) => n.valor === 0)) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {numeros.map((n) => (
        <li key={n.label}>
          <Link
            href={n.href}
            scroll={false}
            className="flex h-full flex-col gap-0.5 rounded-xl border border-black/10 px-4 py-3.5 transition-colors hover:border-brand-600/40 hover:bg-brand-600/[0.04] dark:border-white/10"
          >
            <span className={`text-2xl font-semibold tabular-nums ${n.tom ?? ''}`}>{n.valor}</span>
            <span className="text-xs opacity-55">{n.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
