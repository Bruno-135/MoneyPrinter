import { escreverValor } from '@/lib/deals/dinheiro';
import type { ServicoVendido } from '@/lib/servicos/vendidos';
import type { OportunidadeDoComercio } from '@/lib/servicos/catalogo';
import { venderServico, cancelarServicoVendido, apagarServicoVendido } from '../deal-actions';

/**
 * O que este cliente já comprou, e o que se lhe pode vender a seguir.
 *
 * Uma caixa só para as duas coisas, de propósito: separá-las era obrigar a
 * olhar para dois sítios para responder à mesma pergunta — o que é que falta
 * vender a este? A lista de cima é a conta, a de baixo é a oportunidade.
 *
 * A primeira venda passa o negócio a ganho. As seguintes não mexem no funil:
 * ele já é cliente, e voltar a marcar "ganho" não diz nada de novo.
 */
export function ServicosVendidos({
  businessId,
  vendidos,
  porVender,
  moeda,
}: {
  businessId: string;
  vendidos: readonly ServicoVendido[];
  /** Do catálogo, já sem os que ele comprou. */
  porVender: readonly OportunidadeDoComercio[];
  moeda: string;
}) {
  const ativos = vendidos.filter((v) => v.canceladoEm === null);
  const mensal = ativos
    .filter((v) => v.mensal && v.valorCentimos !== null)
    .reduce((soma, v) => soma + v.valorCentimos!, 0);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Serviços vendidos</h2>
        {mensal > 0 && (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {escreverValor(mensal, moeda)} por mês
          </p>
        )}
      </div>

      {vendidos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {vendidos.map((v) => {
            const cancelado = v.canceladoEm !== null;

            return (
              <li
                key={v.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2.5 text-sm ${
                  cancelado
                    ? 'border-black/10 opacity-50 dark:border-white/10'
                    : 'border-emerald-600/30 bg-emerald-500/[0.06]'
                }`}
              >
                <span className="font-medium">{v.servico?.nome ?? v.slug}</span>

                {v.valorCentimos !== null && (
                  <span className="tabular-nums">
                    {escreverValor(v.valorCentimos, v.moeda)}
                    {v.mensal && <span className="opacity-60"> /mês</span>}
                  </span>
                )}

                <span className="text-xs opacity-55">
                  {cancelado
                    ? `cancelado a ${new Date(v.canceladoEm!).toLocaleDateString('pt-PT')}`
                    : `desde ${new Date(v.vendidoEm).toLocaleDateString('pt-PT')}`}
                </span>

                <span className="ml-auto flex shrink-0 items-center gap-3">
                  {!cancelado && (
                    <form action={cancelarServicoVendido}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="businessId" value={businessId} />
                      <button type="submit" className="text-xs underline underline-offset-4 opacity-55">
                        Cancelou
                      </button>
                    </form>
                  )}
                  <form action={apagarServicoVendido}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="businessId" value={businessId} />
                    <button type="submit" className="text-xs text-red-600 dark:text-red-400">
                      Apagar
                    </button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Registar. O serviço escolhe-se de uma lista que só tem o que ele
          ainda não comprou — oferecer o que já é dele seria convidar ao
          engano. */}
      {porVender.length > 0 ? (
        <form
          action={venderServico}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
        >
          <input type="hidden" name="businessId" value={businessId} />

          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-55">Vendeu o quê</span>
            <select
              name="servico"
              className="rounded-md border border-black/15 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            >
              {porVender.map((o) => (
                <option key={o.servico.slug} value={o.servico.slug}>
                  {o.servico.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-55">Quanto</span>
            <input
              name="valor"
              inputMode="decimal"
              placeholder={moeda === 'BRL' ? 'R$ 150,00' : '30,00'}
              className="w-28 rounded-md border border-black/15 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
            />
          </label>

          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="mensal" defaultChecked className="size-4 accent-brand-600" />
            por mês
          </label>

          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Registar venda
          </button>

          {vendidos.length === 0 && (
            <p className="w-full text-xs opacity-55">
              A primeira venda passa o negócio a <strong>ganho</strong>. Se for o site, a landing
              page <strong>deixa de expirar</strong> — sem isso, o site do cliente desaparecia
              sozinho no fim da validade.
            </p>
          )}
        </form>
      ) : (
        <p className="rounded-lg border border-dashed border-black/15 px-4 py-3 text-center text-sm opacity-55 dark:border-white/15">
          Já lhe vendeste tudo o que há no catálogo.
        </p>
      )}
    </section>
  );
}
