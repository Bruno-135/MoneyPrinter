import { escreverValor } from '@/lib/deals/dinheiro';
import { marcarVenda, desmarcarVenda } from '../deal-actions';

/**
 * Registar a venda, na ficha do comércio.
 *
 * Duas coisas acontecem ao carregar em "Registar venda": o negócio passa a
 * ganho com o valor guardado, e a landing page deixa de expirar. A segunda é a
 * que ninguém se lembraria de pedir e a que evita o pior: uma página publicada
 * tem validade, e para o site de quem pagou isso é o desaparecimento silencioso
 * ao fim de um mês.
 *
 * Por isso a caixa diz o que vai acontecer à página. Uma ação que faz duas
 * coisas tem de anunciar as duas — a que não se anuncia é a que surpreende
 * alguém mais tarde.
 */
export function Venda({
  businessId,
  valorCentimos,
  mensal,
  moeda,
  wonAt,
  temPaginaPublicada,
}: {
  businessId: string;
  valorCentimos: number | null;
  mensal: boolean;
  moeda: string;
  wonAt: string | null;
  temPaginaPublicada: boolean;
}) {
  const vendido = wonAt !== null;

  if (vendido) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-600/30 bg-emerald-500/[0.07] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Venda registada
            {valorCentimos !== null && (
              <>
                {' — '}
                {escreverValor(valorCentimos, moeda)}
                {mensal ? ' por mês' : ''}
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs opacity-60">
            {new Date(wonAt).toLocaleDateString('pt-PT')}
            {temPaginaPublicada
              ? ' · a página está no ar e já não expira.'
              : ' · ainda não há página publicada para este cliente.'}
          </p>
        </div>

        <form action={desmarcarVenda}>
          <input type="hidden" name="businessId" value={businessId} />
          <button type="submit" className="text-sm underline underline-offset-4 opacity-55">
            Anular
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={marcarVenda}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <input type="hidden" name="businessId" value={businessId} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-55">Quanto ficou a pagar</span>
          <input
            name="valor"
            inputMode="decimal"
            placeholder={moeda === 'BRL' ? 'R$ 150,00' : '30,00'}
            className="w-32 rounded-md border border-black/15 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="mensal"
            defaultChecked
            className="size-4 accent-brand-600"
          />
          por mês
        </label>

        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Registar venda
        </button>
      </div>

      <p className="text-xs opacity-55">
        {/* O aviso não é decoração: é a metade da ação que ninguém pediu. */}
        Passa o negócio a <strong>ganho</strong> e faz a landing page{' '}
        <strong>deixar de expirar</strong> — sem isto, o site do cliente
        desaparecia sozinho no fim da validade. Sem valor escrito também vale: a
        venda fica registada na mesma.
      </p>
    </form>
  );
}
