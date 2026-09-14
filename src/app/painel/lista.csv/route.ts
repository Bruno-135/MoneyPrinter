import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_KINDS,
  isWebsiteKind,
  rankBusinesses,
  type WebsiteKindFilter,
} from '@/lib/scoring/rank';
import { CATEGORIES, findCategory } from '@/lib/places/categories';
import { ehCodigoPais, nomeDoPais } from '@/lib/places/paises';
import { isValidStage, stageLabel, type DealStage } from '@/lib/deals/stages';
import { isProspectSort, DEFAULT_SORT } from '@/lib/scoring/sort';
import { googleMapsUrl } from '@/lib/places/links';
import { listSearchBatches } from '@/lib/places/searches';
import { nomeDoFicheiro, paraCsv } from '@/lib/exportar/csv';

/**
 * A lista de contacto, para abrir no Excel.
 *
 * Leva EXATAMENTE o que está no ecrã: os mesmos filtros, a mesma ordem. Um
 * botão de descarregar que devolvesse outra coisa diferente do que se está a
 * ver seria pior do que não existir — ninguém confere mil linhas, e a diferença
 * só apareceria no dia em que alguém ligasse ao comércio errado.
 *
 * O limite é alto de propósito. O painel mostra cem porque mais do que isso não
 * se lê; um ficheiro serve precisamente para levar o resto.
 */

export const dynamic = 'force-dynamic';

/** Quantas linhas leva o ficheiro. Acima disto a consulta começa a demorar. */
const MAXIMO = 5000;

function lerLista(raw: string | null, valido: (v: string) => boolean): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((v) => v.trim()).filter((v) => v !== '' && valido(v)))];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  // Sem sessão não há ficheiro. É a mesma regra do painel, e aqui é ainda mais
  // importante: isto sai da aplicação como um ficheiro que fica no disco de
  // alguém.
  if (!auth.user) {
    return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const p = url.searchParams;

  const sites = lerLista(p.get('site'), isWebsiteKind) as WebsiteKindFilter[];
  const estados = lerLista(p.get('estado'), isValidStage) as DealStage[];
  const ramos = lerLista(p.get('ramo'), (v) => CATEGORIES.some((c) => c.slug === v));
  const pais = ehCodigoPais(p.get('pais')) ? p.get('pais')! : '';
  const paginaParam = p.get('pagina');
  const temPagina = paginaParam === 'sim' ? true : paginaParam === 'nao' ? false : null;
  const ordemPedida = p.get('ordem');
  const ordem = isProspectSort(ordemPedida) ? ordemPedida : DEFAULT_SORT;

  // A procura valida-se contra os lotes reais: um identificador inventado à mão
  // no endereço não pode chegar à consulta.
  const batches = await listSearchBatches(supabase);
  const batch = batches.find((b) => b.regionId === p.get('procura')) ?? null;

  const { businesses } = await rankBusinesses(supabase, {
    kinds: sites.length > 0 ? sites : DEFAULT_KINDS,
    stages: estados,
    categories: ramos,
    countries: pais ? [pais] : [],
    hasSite: temPagina,
    regionId: batch?.regionId ?? null,
    sort: ordem,
    limit: MAXIMO,
  });

  const colunas = [
    'Nome',
    'Ramo',
    'Cidade',
    'País',
    'Telefone',
    'Score',
    'Temperatura',
    'Avaliação',
    'Nº de avaliações',
    'Presença online',
    'Estado',
    'Já tem página',
    'Morada',
    'Google Maps',
  ];

  const PRESENCA: Record<string, string> = {
    none: 'Sem site',
    social_only: 'Só rede social',
    real: 'Tem site',
  };

  const linhas = businesses.map((b) => [
    b.name,
    findCategory(b.category)?.label ?? b.category,
    b.locality ?? '',
    nomeDoPais(b.countryCode),
    b.phone ?? '',
    b.score,
    b.label,
    // Vírgula decimal: o Excel de cá lê 4.6 como texto e 4,6 como número.
    b.rating !== null ? b.rating.toFixed(1).replace('.', ',') : '',
    b.reviewsCount ?? '',
    PRESENCA[b.websiteKind] ?? b.websiteKind,
    stageLabel(b.stage),
    b.hasSite ? 'Sim' : 'Não',
    b.address ?? '',
    googleMapsUrl({
      googlePlaceId: b.googlePlaceId,
      name: b.name,
      address: b.address,
      latitude: b.latitude,
      longitude: b.longitude,
    }),
  ]);

  // O nome do ficheiro diz o que lá está dentro, para se perceber qual é qual
  // na pasta das transferências daqui a uma semana.
  const base = batch
    ? `${batch.categoryLabel} ${batch.label}`
    : ramos.length === 1
      ? (findCategory(ramos[0]!)?.label ?? 'comercios')
      : 'comercios';

  return new NextResponse(paraCsv(colunas, linhas), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeDoFicheiro(base)}"`,
      // Uma lista de contactos não se guarda em cache nenhuma pelo caminho.
      'cache-control': 'no-store',
    },
  });
}
