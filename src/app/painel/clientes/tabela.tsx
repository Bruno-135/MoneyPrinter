import Link from 'next/link';
import type { ClienteNaCarteira } from '@/lib/servicos/vendidos';
import { SERVICOS } from '@/lib/servicos/catalogo';
import { escreverValor } from '@/lib/deals/dinheiro';
import { whatsappUrl } from '@/lib/places/links';

/**
 * A carteira em tabela, uma coluna por serviço.
 *
 * Uma coluna por serviço em vez de uma lista por linha: o que interessa aqui é
 * comparar clientes, e para comparar é preciso que a mesma coisa esteja sempre
 * no mesmo sítio. Assim os buracos alinham-se na vertical e vê-se de relance
 * quem ainda não comprou o quê.
 */
export function TabelaCarteira({ clientes }: { clientes: readonly ClienteNaCarteira[] }) {
  return (
    <div>
      {/* No telemóvel só cabem duas colunas e nada diz que há mais. Sem este
          aviso a carteira parece ter dois serviços. */}
      <p className="mb-2 text-xs opacity-50 sm:hidden">
        Arrasta a tabela para o lado para ver todos os serviços.
      </p>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs tracking-wide text-black/55 uppercase dark:bg-white/[0.04] dark:text-white/55">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Por mês</th>
              {SERVICOS.map((s) => (
                <th key={s.slug} className="px-3 py-3 text-center font-medium" title={s.nome}>
                  {s.curto}
                </th>
              ))}
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const whatsapp = whatsappUrl(c.phone);

              return (
                <tr
                  key={c.businessId}
                  className="border-t border-line"
                >
                  {/* Deixado a quebrar linha de propósito: com nowrap um nome
                      comprido empurra as sete colunas de serviços para fora do
                      ecrã do telemóvel e não se vê nenhuma. */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/painel/comercio/${c.businessId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {c.nome}
                    </Link>
                    <span className="mt-0.5 block text-xs opacity-50">
                      {/* Numa linha própria, e não ao lado do nome: sete
                          colunas de serviços já disputam a largura de um
                          telemóvel, e a referência é para se ler, não para
                          competir. */}
                      {c.codigo && <span className="font-mono tabular-nums">{c.codigo}</span>}
                      {c.codigo && c.locality && ' · '}
                      {c.locality}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {c.mensalCentimos > 0 ? escreverValor(c.mensalCentimos, c.moeda) : '—'}
                  </td>

                  {SERVICOS.map((s) => {
                    const tem = c.ativos.includes(s.slug);
                    const teve = c.cancelados.includes(s.slug);

                    return (
                      <td key={s.slug} className="px-3 py-3 text-center">
                        {tem ? (
                          <span className="text-emerald-600 dark:text-emerald-400" title={s.nome}>
                            ✓
                          </span>
                        ) : teve ? (
                          <span className="text-rose-500/70" title={`${s.nome} — cancelado`}>
                            ✕
                          </span>
                        ) : (
                          // Vazio e não um traço: o que salta à vista tem de ser
                          // o buraco, que é onde está a venda seguinte.
                          <span className="opacity-15">·</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-3 text-right">
                    {whatsapp && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white"
                      >
                        WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
