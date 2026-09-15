import Link from 'next/link';
import type { ParaHoje } from '@/lib/deals/agenda';
import { stageLabel } from '@/lib/deals/stages';
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
    <section className="rounded-2xl border border-line bg-surf p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">Seguimentos para hoje</h2>
        {atrasados > 0 && (
          <span className="font-mono text-[11px] text-bad">
            {atrasados === 1 ? '1 atrasado' : `${atrasados} atrasados`}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {itens.map((i) => {
          const whatsapp = whatsappUrl(i.phone);
          const atrasado = i.atraso > 0;

          return (
            <li
              key={i.businessId}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-surf2 p-2.5"
            >
              {/* A barrinha de cor à esquerda, como no desenho: diz o estado
                  sem gastar uma etiqueta de texto na linha. */}
              <span
                className={`h-8 w-1 shrink-0 rounded-full ${atrasado ? 'bg-bad' : 'bg-line'}`}
              />

              <Link href={`/painel/comercio/${i.businessId}`} className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{i.nome}</span>
                <span className="block truncate text-xs text-ink3">
                  {i.passo || stageLabel(i.stage)}
                </span>
              </Link>

              <span
                className={`shrink-0 font-mono text-[11px] whitespace-nowrap ${
                  atrasado ? 'text-bad' : 'text-ink3'
                }`}
              >
                {atrasado ? (i.atraso === 1 ? '1 dia' : `${i.atraso} dias`) : 'hoje'}
              </span>

              {/* Os dois atalhos que evitam abrir a ficha só para ligar. */}
              {i.phone && (
                <a
                  href={`tel:${i.phone}`}
                  className="hidden h-8 shrink-0 items-center rounded-lg border border-line px-2.5 text-xs font-medium sm:flex"
                >
                  Ligar
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 shrink-0 items-center rounded-lg bg-ok px-2.5 text-xs font-bold text-bg"
                >
                  WhatsApp
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
