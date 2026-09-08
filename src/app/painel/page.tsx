import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_KINDS,
  WEBSITE_KIND_LABELS,
  isWebsiteKind,
  listFacet,
  rankBusinesses,
  type WebsiteKindFilter,
} from '@/lib/scoring/rank';
import { listSearchBatches } from '@/lib/places/searches';
import {
  DEFAULT_SORT,
  SORTS,
  dateShownFor,
  describeWhen,
  isProspectSort,
  type ProspectSort,
} from '@/lib/scoring/sort';
import { FilterBar } from './filter-bar';
import { ColumnFilter } from './column-filter';
import { STAGES, isValidStage, type DealStage } from '@/lib/deals/stages';
import { googleMapsUrl } from '@/lib/places/links';
import { ScanForm } from './scan-form';
import { StageSelect } from './stage-select';
import { signOut } from './actions';

export const dynamic = 'force-dynamic';

const SITE_LABEL: Record<string, string> = {
  none: 'sem site',
  social_only: 'só rede social',
  real: 'tem site',
};

const SITE_STYLE: Record<string, string> = {
  none: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  social_only: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  real: 'bg-black/10 opacity-60 dark:bg-white/10',
};

interface PainelProps {
  searchParams: Promise<{
    estado?: string;
    site?: string;
    procura?: string;
    ordem?: string;
    comercio?: string;
  }>;
}


/**
 * Monta o endereço mudando UMA das três dimensões e mantendo as outras duas.
 *
 * Antes, cada link era escrito à mão com `site=${siteFilter}` lá dentro. Com um
 * filtro a mais isso passa a ser o sítio onde se perde um parâmetro sem dar por
 * isso — carregar num estado apagava a procura escolhida e a lista voltava a
 * misturar tudo, que é exatamente o problema que este ecrã existe para
 * resolver.
 */
interface PainelFilters {
  /** Tipos de presença online marcados. Vazio = todos. */
  site: string[];
  /** Estados marcados. Vazio = todos. */
  estado: string[];
  /** Comércios marcados. Vazio = todos. */
  comercio: string[];
  procura: string | null;
  ordem: string;
}

/** Lê um parâmetro com vários valores separados por vírgula. */
function readList(raw: string | undefined, valid: (v: string) => boolean): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((v) => v.trim()).filter((v) => v !== '' && valid(v)))];
}

function painelHref(current: PainelFilters, change: Partial<PainelFilters>): Route {
  const next = { ...current, ...change };
  const params = new URLSearchParams();

  if (next.procura) params.set('procura', next.procura);
  if (next.ordem !== DEFAULT_SORT) params.set('ordem', next.ordem);
  if (next.comercio.length > 0) params.set('comercio', next.comercio.join(','));
  if (next.estado.length > 0) params.set('estado', next.estado.join(','));
  if (next.site.length > 0) params.set('site', next.site.join(','));

  const query = params.toString();
  return (query ? `/painel?${query}` : '/painel') as Route;
}

export default async function PainelPage({ searchParams }: PainelProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const params = await searchParams;

  // Os lotes leem-se primeiro, e não em paralelo com o resto, porque é o que
  // valida o `procura` que vem do endereço. Um identificador inventado à mão
  // não pode chegar à consulta: no melhor caso devolvia uma lista vazia sem
  // explicação, no pior rebentava a ler um uuid que não é um uuid.
  const batches = await listSearchBatches(supabase);
  const batch = batches.find((b) => b.regionId === params.procura) ?? null;
  const procura = batch?.regionId ?? null;
  const ordem = isProspectSort(params.ordem) ? params.ordem : DEFAULT_SORT;

  const estados = readList(params.estado, isValidStage) as DealStage[];
  const sites = readList(params.site, isWebsiteKind) as WebsiteKindFilter[];

  // Sem escolha nenhuma no filtro de site, mostram-se os prospetos. Quem já tem
  // site a sério não se vai contactar, e enchia a lista.
  const kinds = sites.length > 0 ? sites : DEFAULT_KINDS;

  // Cada caixa de filtro calcula-se com os filtros das OUTRAS, nunca com a
  // dela própria. É o que o Excel faz, e é a única maneira que funciona: uma
  // caixa que se filtre a si mesma fica com uma opção só depois da primeira
  // escolha, e não há como voltar atrás lá de dentro.
  const semComercio = { kinds, stages: estados, regionId: procura };
  const semEstado = { kinds, regionId: procura };
  const semSite = { stages: estados, regionId: procura };

  const [comerciosFacet, estadosFacet, sitesFacet] = await Promise.all([
    listFacet(supabase, 'id', semComercio),
    listFacet(supabase, 'stage', semEstado),
    listFacet(supabase, 'website_kind', semSite),
  ]);

  const comercios = readList(params.comercio, (v) => comerciosFacet.some((c) => c.value === v));

  const here: PainelFilters = { site: sites, estado: estados, comercio: comercios, procura, ordem };

  const { businesses, total } = await rankBusinesses(supabase, {
    kinds,
    stages: estados,
    businessIds: comercios,
    regionId: procura,
    sort: ordem,
    limit: 100,
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">Prospeção comercial</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Procurar comércios</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/painel/relatorios" className="underline underline-offset-4 opacity-70">
            Relatórios
          </Link>
          <form action={signOut}>
            <button type="submit" className="underline underline-offset-4 opacity-60">
              Sair ({auth.user.email})
            </button>
          </form>
        </div>
      </header>

      <ScanForm />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {batch ? `${batch.label} · ${batch.categoryLabel}` : 'Prospetos'}{' '}
          <span className="text-base font-normal opacity-55">
            {total > 0
              ? `· ${total} · ${(SORTS.find((s) => s.value === ordem)?.label ?? '').toLowerCase()}`
              : ''}
          </span>
        </h2>

        {/*
          Em cima ficam só os dois filtros que NÃO são colunas da tabela: de que
          procura veio, e por que ordem se mostra. Os outros três — comércio,
          estado e site — mudaram-se para o funil do respetivo cabeçalho, que é
          onde uma pessoa que usa Excel os vai procurar.
        */}
        <FilterBar
          groups={[
            ...(batches.length > 0
              ? [
                  {
                    label: 'Procura',
                    current: procura ?? '',
                    options: [
                      { value: '', label: 'Todas as procuras', href: painelHref(here, { procura: null }) },
                      ...batches.map((b) => ({
                        value: b.regionId,
                        label: `${b.label} · ${b.categoryLabel} (${b.prospects})`,
                        href: painelHref(here, { procura: b.regionId }),
                      })),
                    ],
                  },
                ]
              : []),
            {
              label: 'Ordem',
              current: ordem,
              options: SORTS.map((s) => ({
                value: s.value,
                label: s.label,
                href: painelHref(here, { ordem: s.value }),
              })),
            },
          ]}
        />

        {businesses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 px-5 py-8 text-center text-sm opacity-60 dark:border-white/15">
            {comercios.length > 0 || estados.length > 0 || sites.length > 0
              ? 'Nenhum comércio com estes filtros. Limpa um dos funis no cabeçalho da tabela.'
              : batch
                ? `A procura ${batch.label} · ${batch.categoryLabel} não deu nenhum comércio.`
                : 'Ainda não há comércios. Faz uma simulação primeiro para ver o custo, e depois procura a sério.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
{/* Cor em vez de `opacity`: a opacidade aplica-se a tudo o que está
                  dentro do cabeçalho, e deixava o funil do filtro apagado. */}
              <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-black/55 dark:bg-white/[0.04] dark:text-white/55">
                <tr>
                  <SortHeader label="Score" sort="score" current={ordem} here={here} />
                  <SortHeader label="Comércio" sort="nome" current={ordem} here={here}>
                    <ColumnFilter
                      label="Comércio"
                      param="comercio"
                      values={comerciosFacet}
                      selected={comercios}
                      baseHref={painelHref(here, { comercio: [] })}
                    />
                  </SortHeader>
                  <SortHeader label="Adicionado" sort="adicionados" current={ordem} here={here} />
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Estado
                      <ColumnFilter
                        label="Estado"
                        param="estado"
                        values={estadosFacet.map((f) => ({
                          ...f,
                          label: STAGES.find((stage) => stage.value === f.value)?.label ?? f.value,
                        }))}
                        selected={estados}
                        baseHref={painelHref(here, { estado: [] })}
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Site
                      <ColumnFilter
                        label="Site"
                        param="site"
                        values={sitesFacet.map((f) => ({
                          ...f,
                          label: WEBSITE_KIND_LABELS[f.value as WebsiteKindFilter] ?? f.value,
                        }))}
                        selected={sites}
                        baseHref={painelHref(here, { site: [] })}
                      />
                    </span>
                  </th>
                  <SortHeader label="Avaliações" sort="avaliacoes" current={ordem} here={here} />
                  <th className="px-4 py-3 font-medium">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id} className="border-t border-black/[0.07] dark:border-white/[0.07]">
                    <td className="px-4 py-3">
                      <span className="font-semibold tabular-nums">{b.score}</span>
                      <span className="ml-1.5 text-xs opacity-55">{b.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/painel/comercio/${b.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {b.name}
                      </Link>
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
                        className="ml-2 opacity-45 hover:opacity-100"
                      >
                        ↗
                      </a>
                      <span className="ml-2 text-xs opacity-50">{b.category}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-55">
                      {/* A data mostrada acompanha a ordem escolhida: ordenar
                          por "adicionados" e mostrar a data da última procura
                          daria números que não batem certo com a ordem. */}
                      {describeWhen(
                        dateShownFor(ordem) === 'last' ? b.lastSyncedAt : b.firstSeenAt,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StageSelect businessId={b.id} stage={b.stage} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${SITE_STYLE[b.websiteKind] ?? ''}`}>
                        {SITE_LABEL[b.websiteKind] ?? b.websiteKind}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums opacity-70">
                      {b.rating !== null ? `${b.rating}★ (${b.reviewsCount ?? 0})` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums opacity-70">
                      {b.phone ? (
                        <a href={`tel:${b.phone}`} className="hover:text-brand-600">
                          {b.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}


/**
 * Cabeçalho de coluna que ordena a lista ao ser clicado.
 *
 * Faz o mesmo que a caixa "Ordem" lá em cima, de propósito: as duas escrevem o
 * mesmo parâmetro no endereço, portanto não são dois controlos a discordar — é
 * um controlo com duas maneiras de lhe chegar. A caixa serve o telemóvel, onde
 * a tabela anda de lado e os cabeçalhos ficam fora do ecrã; o cabeçalho serve
 * quem está no computador, com a coluna à frente dos olhos.
 */
function SortHeader({
  label,
  sort,
  current,
  here,
  children,
}: {
  label: string;
  sort: ProspectSort;
  current: ProspectSort;
  here: PainelFilters;
  /** O funil do filtro, quando a coluna tem um. Fica ao lado do nome, fora do
   *  link: clicar no funil não pode ordenar a lista de caminho. */
  children?: React.ReactNode;
}) {
  const active = current === sort;

  return (
    <th className="px-4 py-3 font-medium">
      <span className="inline-flex items-center gap-1">
        <Link
          href={painelHref(here, { ordem: sort })}
          className={`inline-flex items-center gap-1 hover:text-brand-600 ${active ? 'text-brand-600' : ''}`}
        >
          {label}
          <span aria-hidden className={active ? '' : 'opacity-25'}>
            ↓
          </span>
        </Link>
        {children}
      </span>
    </th>
  );
}
