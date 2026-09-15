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

/** Os tons do desenho. Nomes e não classes, para a cor viver num sítio só. */
export type Tom = 'normal' | 'acc' | 'ok' | 'warm' | 'cool' | 'hot' | 'bad';

const COR: Record<Tom, string> = {
  normal: 'text-ink',
  acc: 'text-acc',
  ok: 'text-ok',
  warm: 'text-warm',
  cool: 'text-cool',
  hot: 'text-hot',
  bad: 'text-bad',
};

export interface Numero {
  label: string;
  valor: number | string;
  href: Route;
  /** Uma linha pequena por baixo do valor. O que o número quer dizer. */
  nota?: string;
  tom?: Tom;
}

export function Numeros({ numeros }: { numeros: readonly Numero[] }) {
  if (numeros.every((n) => n.valor === 0)) return null;

  return (
    // `auto-fit` com mínimo de 152px, como no desenho: os cartões enchem a
    // linha no computador e caem para dois por linha no telemóvel sem
    // precisarem de um ponto de quebra escrito à mão.
    <ul className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(152px,1fr))]">
      {numeros.map((n) => (
        <li key={n.label}>
          <Link
            href={n.href}
            scroll={false}
            className="flex h-full flex-col gap-1.5 rounded-2xl border border-line bg-surf p-3 transition-colors hover:border-acc/50"
          >
            <span className="font-mono text-[11px] leading-snug tracking-[0.08em] text-ink3 uppercase">
              {n.label}
            </span>
            <span className={`font-mono text-2xl font-bold tabular-nums ${COR[n.tom ?? 'normal']}`}>
              {n.valor}
            </span>
            {n.nota && <span className="text-[11px] text-ink3">{n.nota}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
