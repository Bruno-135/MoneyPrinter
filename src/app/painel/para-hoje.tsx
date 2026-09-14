import Link from 'next/link';
import type { ParaHoje } from '@/lib/deals/agenda';
import { STAGE_STYLE, stageLabel } from '@/lib/deals/stages';
import { whatsappUrl } from '@/lib/places/links';

/**
 * O que ficou marcado para hoje.
 *
 * O campo "próximo passo · quando" existia na ficha desde o princípio e não
 * aparecia em lado nenhum: escrevia-se "voltar a ligar na quinta" e a
 * quinta-feira passava sem ninguém ser avisado. Um lembrete que não lembra é
 * pior do que nenhum, porque dá a sensação de estar tratado.
 *
 * O atrasado vem primeiro e vem marcado. Um seguimento esquecido há três dias
 * é mais urgente do que um de hoje, não menos — e é o que se perde primeiro
 * quando há trabalho a mais.
 */
export function ParaHojeLista({ itens }: { itens: readonly ParaHoje[] }) {
  if (itens.length === 0) return null;

  const atrasados = itens.filter((i) => i.atraso > 0).length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-sm font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
          Para hoje
        </h2>
        <p className="text-sm opacity-60">
          {itens.length} {itens.length === 1 ? 'seguimento marcado' : 'seguimentos marcados'}
          {atrasados > 0 && ` · ${atrasados} em atraso`}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {itens.map((i) => {
          const whatsapp = whatsappUrl(i.phone);

          return (
            <li key={i.businessId} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              <Link
                href={`/painel/comercio/${i.businessId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {i.nome}
              </Link>

              <span
                className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STAGE_STYLE[i.stage]}`}
              >
                {stageLabel(i.stage)}
              </span>

              {i.atraso > 0 && (
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-red-700 dark:text-red-300">
                  {i.atraso === 1 ? '1 dia de atraso' : `${i.atraso} dias de atraso`}
                </span>
              )}

              {i.passo && <span className="opacity-60">{i.passo}</span>}

              {/* Os dois atalhos que evitam abrir a ficha só para ligar. */}
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {i.phone && (
                  <a
                    href={`tel:${i.phone}`}
                    className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium whitespace-nowrap dark:border-white/20"
                  >
                    Ligar
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    WhatsApp
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
