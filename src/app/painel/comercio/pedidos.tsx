import Link from 'next/link';
import type { Pedido } from '@/lib/suporte/repository';
import { prazo } from '@/lib/suporte/prazos';
import { SERVICOS } from '@/lib/servicos/catalogo';

const ETIQUETA: Record<string, string> = {
  atrasado: 'border-bad text-bad',
  hoje: 'border-warm text-warm',
  amanha: 'border-line text-ink3',
  a_caminho: 'border-line text-ink3',
  fechado_no_prazo: 'border-ok text-ok',
  fechado_atrasado: 'border-line text-ink3',
};

/**
 * O que este cliente já pediu, na ficha dele.
 *
 * Só aparece quando há pedidos. Numa ficha de prospeto — que é a esmagadora
 * maioria — uma secção vazia de suporte só empurrava para baixo o que interessa
 * ali, que é o que se lhe pode vender.
 *
 * Anota-se na caixa de suporte e não aqui: um formulário repetido em dois sítios
 * são duas coisas para manter a par, e a caixa é onde se está quando o cliente
 * escreve.
 */
export function PedidosDoCliente({ pedidos }: { pedidos: readonly Pedido[] }) {
  if (pedidos.length === 0) return null;

  const abertos = pedidos.filter((p) => p.closed_at === null).length;

  return (
    <section className="rounded-2xl border border-line bg-surf p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">O que ele pediu</h2>
        <Link href="/painel/suporte" className="font-mono text-[11px] text-acc">
          {abertos > 0 ? `${abertos} por fazer` : 'tudo feito'} &rarr;
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {pedidos.slice(0, 8).map((pedido) => {
          const p = prazo(pedido.due_at, pedido.closed_at);
          const fechado = pedido.closed_at !== null;
          const servico = SERVICOS.find((s) => s.slug === pedido.servicoSlug);

          return (
            <li
              key={pedido.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surf2 p-2.5 ${
                fechado ? 'opacity-55' : ''
              }`}
            >
              <span className={`flex-1 text-[13px] ${fechado ? 'line-through' : ''}`}>
                {pedido.titulo}
                {servico && <span className="text-ink3"> · {servico.nome}</span>}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap ${ETIQUETA[p.estado]}`}
              >
                {p.etiqueta}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
