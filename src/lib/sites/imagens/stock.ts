import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Fotografias grátis, pagas uma vez em tempo e nunca mais.
 *
 * O comerciante que ainda não deu fotos fica com imagens geradas (ver
 * `arte.ts`), e isso resolve o buraco mas não engana ninguém: são desenhos. Um
 * banco de fotografia grátis dá o passo seguinte — fotografias a sério, de
 * pão a sério, com licença que permite usá-las num site comercial.
 *
 * Duas regras que não se negoceiam neste ficheiro:
 *
 *  1. CACHE. A resposta fica gravada em `stock_photos` e a mesma pergunta
 *     nunca sai duas vezes para a rede. Não é por dinheiro — este serviço é
 *     grátis — é porque tem limite de pedidos por hora, e ficar sem imagens a
 *     meio de uma tarde de trabalho é o mesmo que estar avariado.
 *  2. CRÉDITO. Guarda-se sempre o nome do fotógrafo e o endereço da foto. A
 *     licença exige o crédito e o site tem de o mostrar; deitar fora esses
 *     campos aqui tornaria impossível cumpri-la lá à frente.
 *
 * Uma falha NUNCA se grava. Gravar uma lista vazia seria ensinar o sistema a
 * responder "não há fotos" para sempre a uma pergunta que só correu mal uma
 * vez.
 */

type Db = SupabaseClient<Database>;

/** Uma fotografia, já reduzida ao que as páginas usam. */
export interface FotoStock {
  /** Identificador no banco de origem. Serve para não repetir a mesma foto. */
  id: string;
  /** O ficheiro a usar na página, já em tamanho de ecrã grande. */
  url: string;
  /** Versão pequena, para as grelhas de escolha do painel. */
  miniatura: string;
  largura: number;
  altura: number;
  /** Descrição da imagem, para leitores de ecrã. Pode vir vazia. */
  alt: string;
  autor: string;
  autorUrl: string;
  /** A página da foto no banco de origem — parte obrigatória do crédito. */
  origem: string;
  /** Cor dominante, para pintar o espaço enquanto a imagem carrega. */
  cor: string;
}

export interface ResultadoStock {
  fotos: FotoStock[];
  /** true quando veio da base de dados e não da rede. */
  doCache: boolean;
  erro: string | null;
}

export type Orientacao = 'landscape' | 'portrait' | 'square';

/**
 * A chave do cache.
 *
 * Sem acentos, sem maiúsculas e sem espaços a mais, para "Bakery bread" e
 * "bakery  bread" serem a mesma pergunta. A orientação entra na chave porque
 * muda a resposta: as fotos deitadas e as em pé são conjuntos diferentes.
 */
export function chaveConsulta(consulta: string, orientacao: Orientacao): string {
  const limpa = consulta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${limpa}|${orientacao}`;
}

/** A forma do que o Pexels devolve. Só os campos que se usam. */
interface PexelsFoto {
  id?: number;
  width?: number;
  height?: number;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  avg_color?: string;
  alt?: string;
  src?: { large2x?: string; large?: string; medium?: string; tiny?: string };
}

/**
 * Traduz a resposta do banco para a nossa forma, deitando fora o que não
 * serve. Está separada da chamada de rede para poder ser testada sem rede.
 */
export function mapearPexels(payload: unknown): FotoStock[] {
  const fotos = (payload as { photos?: PexelsFoto[] } | null)?.photos;
  if (!Array.isArray(fotos)) return [];

  return fotos.flatMap((foto): FotoStock[] => {
    const url = foto.src?.large2x ?? foto.src?.large ?? foto.src?.medium;
    if (!url || foto.id === undefined) return [];

    return [
      {
        id: String(foto.id),
        url,
        miniatura: foto.src?.medium ?? foto.src?.tiny ?? url,
        largura: foto.width ?? 0,
        altura: foto.height ?? 0,
        alt: (foto.alt ?? '').trim(),
        autor: (foto.photographer ?? '').trim() || 'Autor desconhecido',
        autorUrl: foto.photographer_url ?? '',
        origem: foto.url ?? '',
        cor: /^#[0-9a-f]{6}$/i.test(foto.avg_color ?? '') ? foto.avg_color! : '#8A8A8A',
      },
    ];
  });
}

/** O texto do crédito, tal como tem de aparecer na página. */
export function creditoDe(foto: FotoStock): string {
  return `Foto de ${foto.autor} · Pexels`;
}

const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';

/**
 * Procura fotografias, primeiro na base de dados e só depois na rede.
 *
 * A chave é opcional em todo o projeto, por isso a ausência dela não é um erro
 * a berrar: devolve-se uma lista vazia com uma mensagem que diz o que falta e
 * onde. O resto da aplicação continua a funcionar com as imagens geradas.
 */
export async function procurarFotosGratis(
  db: Db,
  opcoes: { consulta: string; orientacao?: Orientacao; quantas?: number; chaveApi?: string },
): Promise<ResultadoStock> {
  const orientacao = opcoes.orientacao ?? 'landscape';
  const quantas = Math.min(Math.max(opcoes.quantas ?? 12, 1), 24);
  const chave = chaveConsulta(opcoes.consulta, orientacao);

  if (chave.split('|')[0]!.length < 2) {
    return { fotos: [], doCache: true, erro: 'A procura está vazia.' };
  }

  const { data: guardado } = await db
    .from('stock_photos')
    .select('results')
    .eq('provider', 'pexels')
    .eq('query_key', chave)
    .maybeSingle();

  if (guardado) {
    const fotos = (guardado.results ?? []) as unknown as FotoStock[];
    return { fotos: fotos.slice(0, quantas), doCache: true, erro: null };
  }

  if (!opcoes.chaveApi) {
    return {
      fotos: [],
      doCache: false,
      erro:
        'Falta a PEXELS_API_KEY. Sem ela as páginas usam as imagens geradas — ' +
        'que continuam a funcionar — mas não há fotografias reais.',
    };
  }

  const url = new URL(PEXELS_ENDPOINT);
  url.searchParams.set('query', opcoes.consulta.trim());
  url.searchParams.set('orientation', orientacao);
  // Pedem-se sempre 24, mesmo que se mostrem 12: a chamada custa o mesmo e o
  // cache fica mais rico para a próxima vez que se quiser trocar de foto.
  url.searchParams.set('per_page', '24');

  let payload: unknown;
  try {
    const resposta = await fetch(url, {
      headers: { Authorization: opcoes.chaveApi },
      // Não há nada de privado nesta chamada, mas também não há razão para o
      // Next a guardar por sua conta: o cache desta casa é a tabela.
      cache: 'no-store',
    });

    if (!resposta.ok) {
      return {
        fotos: [],
        doCache: false,
        erro:
          resposta.status === 401
            ? 'A PEXELS_API_KEY foi recusada. Confirma a chave no painel da Vercel.'
            : `O banco de imagens respondeu ${resposta.status}.`,
      };
    }

    payload = await resposta.json();
  } catch {
    return { fotos: [], doCache: false, erro: 'Não foi possível falar com o banco de imagens.' };
  }

  const fotos = mapearPexels(payload);

  if (fotos.length === 0) {
    // Uma resposta vazia não se grava: pode ser a pergunta a estar má, e daqui
    // a uma semana o banco pode já ter fotos para ela.
    return { fotos: [], doCache: false, erro: 'Não há fotografias para essa procura.' };
  }

  await db.from('stock_photos').insert({
    provider: 'pexels',
    query_key: chave,
    query_text: opcoes.consulta.trim(),
    orientation: orientacao,
    results: fotos as never,
    results_count: fotos.length,
  });

  return { fotos: fotos.slice(0, quantas), doCache: false, erro: null };
}
