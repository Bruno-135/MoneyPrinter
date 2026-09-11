import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_KINDS,
  WEBSITE_KIND_LABELS,
  WEBSITE_KINDS,
  isWebsiteKind,
  listFacet,
  rankBusinesses,
  type WebsiteKindFilter,
} from '@/lib/scoring/rank';
import { listSearchBatches } from '@/lib/places/searches';
import { CATEGORIES, findCategory } from '@/lib/places/categories';
import { ehCodigoPais, nomeDoPais } from '@/lib/places/paises';
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
import { Destaques, fotosDosDestaques } from './destaques';
import { Numeros, type Numero } from './numeros';
import { CartoesComercios, SITE_LABEL, SITE_STYLE } from './cartoes-comercios';

export const dynamic = 'force-dynamic';

interface PainelProps {
  searchParams: Promise<{
    estado?: string;
    site?: string;
    procura?: string;
    ordem?: string;
    ramo?: string;
    pais?: string;
    pagina?: string;
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
  /** Ramos marcados. Vazio = todos. */
  ramo: string[];
  /** País escolhido ('PT', 'BR'). Vazio = todos. */
  pais: string;
  /** 'sim' = já tem landing page, 'nao' = ainda não. Vazio = todos. */
  pagina: string;
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
  if (next.ramo.length > 0) params.set('ramo', next.ramo.join(','));
  if (next.pais) params.set('pais', next.pais);
  if (next.pagina) params.set('pagina', next.pagina);
  if (next.estado.length > 0) params.set('estado', next.estado.join(','));
  if (next.site.length > 0) params.set('site', next.site.join(','));

  const query = params.toString();
  return (query ? `/painel?${query}` : '/painel') as Route;
}

/**
 * Quantos há de um valor numa faceta.
 *
 * `has_site` chega da vista como booleano e o contador das facetas guarda tudo
 * como texto, portanto os valores a procurar são 'true' e 'false' — o que é
 * feio de ler e é a razão de isto ter nome em vez de estar escrito à mão em
 * cada sítio.
 */
function quantosNaFaceta(
  facet: readonly { value: string; count: number }[],
  ...valores: string[]
): number {
  return facet.filter((f) => valores.includes(f.value)).reduce((soma, f) => soma + f.count, 0);
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
  const ramos = readList(params.ramo, (v) => CATEGORIES.some((c) => c.slug === v));

  // O país é uma escolha só, e não uma lista: trabalha-se um mercado de cada
  // vez, e "Portugal e Brasil ao mesmo tempo" é o que já se vê sem filtro
  // nenhum.
  const pais = ehCodigoPais(params.pais) ? params.pais : '';
  const paises = pais ? [pais] : [];

  // 'sim' / 'nao' e não um booleano: um booleano teria de significar ao mesmo
  // tempo "sem página" e "não filtrar por isto", e é nesse tipo de confusão que
  // um filtro passa a mentir.
  const pagina = params.pagina === 'sim' || params.pagina === 'nao' ? params.pagina : '';
  const temPagina = pagina === '' ? null : pagina === 'sim';

  // O país e a página entram em TODAS as facetas, inclusive nas suas próprias:
  // não são funis de coluna a calcular-se uns aos outros, são o âmbito dentro
  // do qual as colunas se contam.
  const ambito = { countries: paises, hasSite: temPagina };

  const semRamo = { ...ambito, kinds, stages: estados, regionId: procura };
  const semEstado = { ...ambito, kinds, categories: ramos, regionId: procura };
  const semSite = { ...ambito, stages: estados, categories: ramos, regionId: procura };

  // A lista de países oferecida sai dos dados e não de uma constante: não vale
  // a pena oferecer "Brasil" a quem só tem comércios portugueses guardados.
  const semPais = { hasSite: temPagina, kinds, stages: estados, categories: ramos, regionId: procura };
  const semPagina = { countries: paises, kinds, stages: estados, categories: ramos, regionId: procura };

  // As duas últimas são para a fila de números e não para os funis: contam
  // dentro da procura escolhida e fora dos filtros das colunas, para servirem
  // de ponto de referência estável enquanto se mexe na tabela.
  // O país entra aqui porque é âmbito, tal como a procura. O filtro da página
  // não: esse é trabalho em curso, e os números têm de continuar a dizer o
  // mesmo enquanto se mexe nele.
  const soProcura = { regionId: procura, countries: paises };

  const [ramosFacet, estadosFacet, sitesFacet, paisesFacet, paginaFacet, sitesTotal, estadosTotal] =
    await Promise.all([
      listFacet(supabase, 'business_category', semRamo),
      listFacet(supabase, 'stage', semEstado),
      listFacet(supabase, 'website_kind', semSite),
      listFacet(supabase, 'country_code', semPais),
      listFacet(supabase, 'has_site', semPagina),
      listFacet(supabase, 'website_kind', soProcura),
      listFacet(supabase, 'stage', soProcura),
    ]);

  const here: PainelFilters = {
    site: sites,
    estado: estados,
    ramo: ramos,
    pais,
    pagina,
    procura,
    ordem,
  };

  const { businesses, total } = await rankBusinesses(supabase, {
    kinds,
    stages: estados,
    categories: ramos,
    countries: paises,
    hasSite: temPagina,
    regionId: procura,
    sort: ordem,
    limit: 100,
  });

  // Os três por onde começar: melhor pontuação, ainda por contactar, dentro
  // dos filtros que estiverem postos. Só se a lista estiver por pontuação —
  // noutra ordem, "os três primeiros" não quer dizer "os três melhores".
  const destaques =
    ordem === 'score' ? businesses.filter((b) => b.stage === 'new').slice(0, 3) : [];
  const fotosDestaques = await fotosDosDestaques(supabase, destaques);

  /** Atalho para a contagem que ignora os funis das colunas. */
  const quantos = quantosNaFaceta;

  // Os estados do meio do funil, num número só. Separá-los daria cinco cartões
  // com dois ou três cada, que é ruído: o que interessa saber de relance é
  // quantas conversas estão abertas, não em que passo exato está cada uma.
  const emConversa = STAGES.filter((s) => s.open && s.value !== 'new').map((s) => s.value);

  // Os cartões de estado abrem com TODOS os tipos de site marcados. O número
  // conta-os todos (um comércio ganho pode entretanto ter site), e um número
  // que muda quando se carrega nele não serve para nada.
  const numeros: Numero[] = [
    {
      label: 'Sem site',
      valor: quantos(sitesTotal, 'none'),
      href: painelHref(here, { site: ['none'], estado: [], ramo: [] }),
      tom: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Só rede social',
      valor: quantos(sitesTotal, 'social_only'),
      href: painelHref(here, { site: ['social_only'], estado: [], ramo: [] }),
      tom: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Por contactar',
      valor: quantos(estadosTotal, 'new'),
      href: painelHref(here, { estado: ['new'], site: [...WEBSITE_KINDS], ramo: [] }),
    },
    {
      label: 'Em conversa',
      valor: quantos(estadosTotal, ...emConversa),
      href: painelHref(here, { estado: emConversa, site: [...WEBSITE_KINDS], ramo: [] }),
      tom: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Ganhos',
      valor: quantos(estadosTotal, 'won'),
      href: painelHref(here, { estado: ['won'], site: [...WEBSITE_KINDS], ramo: [] }),
      tom: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  /**
   * O título dos resultados, escrito como uma frase.
   *
   * "Braga · Padaria · 214" é uma etiqueta de base de dados. "214 padarias sem
   * site em Braga" é a mesma informação dita como quem fala — e é essa a frase
   * que se repete ao cliente, portanto convém tê-la à frente dos olhos.
   */
  const tituloResultados = batch
    ? `${batch.categoryLabel} sem site em ${batch.label}`
    : 'Comércios encontrados';

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      {/* ---------------- Barra de conta ----------------
          Fina e discreta, encostada ao topo. O que era um cabeçalho com o
          título da página passou a ser só isto: o título está agora dentro da
          caixa de procura, que é o que a pessoa vem cá fazer. */}
      <header className="flex items-center justify-between gap-3 border-b border-black/[0.07] pb-4 text-sm dark:border-white/[0.07]">
        <span className="font-semibold tracking-tight">Prospeção comercial</span>
        <div className="flex items-center gap-4">
          <Link href="/painel/relatorios" className="underline underline-offset-4 opacity-70">
            Relatórios
          </Link>
          <form action={signOut}>
            <button type="submit" className="underline underline-offset-4 opacity-55">
              Sair
              {/* O email só a partir de `sm`. Num telemóvel, um endereço
                  comprido empurrava a barra para uma segunda linha e ficava a
                  ocupá-la toda — e saber de que conta se está ligado não vale
                  uma linha inteira do ecrã. Sem `flex-wrap`, agora não há
                  segunda linha para onde cair. */}
              <span className="hidden sm:inline"> ({auth.user.email})</span>
            </button>
          </form>
        </div>
      </header>

      {/* ---------------- A procura, em destaque ----------------
          É o que se vem cá fazer, e por isso ocupa o lugar de honra: caixa
          própria, título grande e centrado, e o aviso do custo por baixo. */}
      <section className="rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-8 sm:px-10 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="rounded-full bg-brand-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-600 uppercase">
              Encontrar comércios sem site
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Procurar comércios</h1>
            <p className="text-sm opacity-60">
              Escolhe a cidade e o ramo. Simula primeiro para ver quanto custa — a simulação não
              gasta nada.
            </p>
          </div>

          <ScanForm />
        </div>
      </section>

      <Numeros numeros={numeros} />

      <Destaques destaques={destaques} fotos={fotosDestaques} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{tituloResultados}</h2>
          {total > 0 && (
            <span className="text-sm opacity-55">
              {total} {total === 1 ? 'comércio' : 'comércios'} ·{' '}
              {(SORTS.find((s) => s.value === ordem)?.label ?? '').toLowerCase()}
            </span>
          )}
        </div>

        {/*
          Em cima ficam só os dois filtros que NÃO são colunas da tabela: de que
          procura veio, e por que ordem se mostra. Os outros três — comércio,
          estado e site — mudaram-se para o funil do respetivo cabeçalho, que é
          onde uma pessoa que usa Excel os vai procurar.
        */}
        <FilterBar
          groups={[
            // O país vem primeiro porque é o filtro mais largo de todos: muda
            // o mercado, e tudo o resto se lê dentro dele. Só aparece se
            // houver mais do que um país guardado — uma caixa com uma opção só
            // é uma caixa a ocupar espaço.
            ...(paisesFacet.length > 1
              ? [
                  {
                    label: 'País',
                    current: pais,
                    options: [
                      { value: '', label: 'Todos os países', href: painelHref(here, { pais: '' }) },
                      ...paisesFacet.map((f) => ({
                        value: f.value,
                        label: `${nomeDoPais(f.value)} (${f.count})`,
                        href: painelHref(here, { pais: f.value }),
                      })),
                    ],
                  },
                ]
              : []),
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
              label: 'Landing page',
              current: pagina,
              options: [
                { value: '', label: 'Com e sem página', href: painelHref(here, { pagina: '' }) },
                {
                  value: 'sim',
                  label: `Já tem página (${quantosNaFaceta(paginaFacet, 'true')})`,
                  href: painelHref(here, { pagina: 'sim' }),
                },
                {
                  value: 'nao',
                  label: `Ainda sem página (${quantosNaFaceta(paginaFacet, 'false')})`,
                  href: painelHref(here, { pagina: 'nao' }),
                },
              ],
            },
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
            {ramos.length > 0 || estados.length > 0 || sites.length > 0
              ? 'Nenhum comércio com estes filtros. Limpa um dos funis no cabeçalho da tabela.'
              : batch
                ? `A procura ${batch.label} · ${batch.categoryLabel} não deu nenhum comércio.`
                : 'Ainda não há comércios. Faz uma simulação primeiro para ver o custo, e depois procura a sério.'}
          </p>
        ) : (
          <>
            {/* Cartões no telemóvel, tabela no computador. Sete colunas não
                cabem em 390px, e `overflow-x-auto` só escondia cinco delas
                fora do ecrã — o telefone incluído, que é o que se vem cá
                buscar. Ver `cartoes-comercios.tsx`. */}
            <CartoesComercios businesses={businesses} ordem={ordem} />

            <div className="hidden overflow-x-auto rounded-lg border border-black/10 md:block dark:border-white/10">
            <table className="w-full text-sm">
{/* Cor em vez de `opacity`: a opacidade aplica-se a tudo o que está
                  dentro do cabeçalho, e deixava o funil do filtro apagado. */}
              <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-black/55 dark:bg-white/[0.04] dark:text-white/55">
                <tr>
                  <SortHeader label="Score" sort="score" current={ordem} here={here} />
                  <SortHeader label="Comércio" sort="nome" current={ordem} here={here}>
                    {/* Filtra por RAMO e não por nome: com quinhentos comércios,
                        uma lista de nomes é para ler, não para escolher. O ramo
                        de cada um está à vista na própria célula. */}
                    <ColumnFilter
                      label="Ramo"
                      param="ramo"
                      values={ramosFacet
                        .map((f) => ({ ...f, label: findCategory(f.value)?.label ?? f.value }))
                        // Por ordem do NOME mostrado, e não do slug: quem lê a
                        // lista lê "Salão de beleza", não "salao-beleza".
                        .sort((a, b) => a.label.localeCompare(b.label, 'pt'))}
                      selected={ramos}
                      baseHref={painelHref(here, { ramo: [] })}
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
                      <span className="ml-2 text-xs opacity-50">{findCategory(b.category)?.label ?? b.category}</span>
                      {/* Sem isto, o filtro "Já tem página" escolhia por uma
                          coisa que não se via em lado nenhum da lista. */}
                      {b.hasSite && (
                        <span className="ml-2 rounded bg-brand-600/10 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-brand-600">
                          com página
                        </span>
                      )}
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
                      {b.rating !== null
                        ? `${b.rating.toFixed(1).replace('.', ',')} ★ (${b.reviewsCount ?? 0})`
                        : '—'}
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
          </>
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
          // Ordenar não é mudar de página: a vista fica onde está, como numa
          // folha de cálculo.
          scroll={false}
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
