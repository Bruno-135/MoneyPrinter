import Link from 'next/link';
import type { RankedBusiness } from '@/lib/scoring/rank';
import { findCategory } from '@/lib/places/categories';
import { googleMapsUrl } from '@/lib/places/links';
import { dateShownFor, describeWhen, type ProspectSort } from '@/lib/scoring/sort';
import { StageSelect } from './stage-select';

/**
 * A mesma lista, em cartões, para ecrãs estreitos.
 *
 * A tabela tem sete colunas. Num computador lê-se de um relance e os funis dos
 * cabeçalhos são o que faz dela uma folha de cálculo; num telemóvel de 390px
 * não cabe, e `overflow-x-auto` resolvia isso empurrando cinco das sete colunas
 * para fora do ecrã. Quem trabalha no telefone ficava a ver o nome e a
 * pontuação e a rolar de lado para tudo o resto — incluindo o telefone, que é
 * exatamente aquilo para que se abre esta lista.
 *
 * Portanto: cartões até `md`, tabela a partir daí. Não é a tabela encolhida, é
 * a mesma informação noutra forma — e a ordem continua a ser a que a tabela
 * tem, porque as duas leem o mesmo array já ordenado pelo servidor.
 *
 * Os funis das colunas não vêm para aqui de propósito. No telemóvel esse
 * trabalho faz-se nas caixas de filtro que estão por cima da lista, que é onde
 * já estavam e onde há espaço para elas.
 */

export const SITE_LABEL: Record<string, string> = {
  none: 'sem site',
  social_only: 'só rede social',
  real: 'tem site',
};

export const SITE_STYLE: Record<string, string> = {
  none: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  social_only: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  real: 'bg-black/10 opacity-60 dark:bg-white/10',
};

export function CartoesComercios({
  businesses,
  ordem,
}: {
  businesses: readonly RankedBusiness[];
  /** A mesma ordem da tabela: decide que data se mostra em cada cartão. */
  ordem: ProspectSort;
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {businesses.map((b) => (
        <li key={b.id} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xl font-semibold tabular-nums">
              {b.score}
              <span className="ml-1.5 text-xs font-normal opacity-55">{b.label}</span>
            </span>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${SITE_STYLE[b.websiteKind] ?? ''}`}
            >
              {SITE_LABEL[b.websiteKind] ?? b.websiteKind}
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            <Link href={`/painel/comercio/${b.id}`} className="font-medium underline-offset-4">
              {b.name}
            </Link>
            {b.hasSite && (
              <span className="shrink-0 rounded bg-brand-600/10 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-brand-600">
                com página
              </span>
            )}
            <a
              href={googleMapsUrl({
                googlePlaceId: b.googlePlaceId,
                name: b.name,
                address: b.address,
                latitude: b.latitude,
                longitude: b.longitude,
              })}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver no Google Maps"
              className="shrink-0 opacity-45"
            >
              ↗
            </a>
          </div>

          <p className="mt-0.5 text-sm opacity-60">
            {findCategory(b.category)?.label ?? b.category}
            {b.rating !== null &&
              ` · ${b.rating.toFixed(1).replace('.', ',')} ★ (${b.reviewsCount ?? 0})`}
            {' · '}
            {describeWhen(dateShownFor(ordem) === 'last' ? b.lastSyncedAt : b.firstSeenAt)}
          </p>

          {/* O telefone com o tamanho de um botão e não de um detalhe: num
              telemóvel, ligar é a ação que esta lista existe para provocar. */}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {b.phone ? (
              <a
                href={`tel:${b.phone}`}
                className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium tabular-nums dark:border-white/15"
              >
                Ligar {b.phone}
              </a>
            ) : (
              <span className="text-sm opacity-45">Sem telefone</span>
            )}
            <StageSelect businessId={b.id} stage={b.stage} />
          </div>
        </li>
      ))}
    </ul>
  );
}
