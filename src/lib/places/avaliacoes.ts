import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PlacesClient } from './client';
import type { PlaceReview } from './types';

/**
 * As avaliações escritas do Google.
 *
 * A nota e o número já apareciam na página. Isto é o que as pessoas
 * escreveram — e é isso que se lê. "4,6 estrelas" é uma estatística; "fui lá
 * às sete da manhã e o pão estava quente" é uma razão para ir.
 *
 * Regra que atravessa este ficheiro: o texto NUNCA se altera, nem se corta ao
 * meio, nem se escolhe só a parte boa. Além de não ser permitido, uma
 * avaliação arranjada deixa de provar seja o que for — e quem vai ler a
 * página do comerciante é o próprio comerciante, que conhece os clientes dele.
 */

type Db = SupabaseClient<Database>;

export interface AvaliacaoReal {
  /** O que a pessoa escreveu, tal e qual. */
  texto: string;
  nota: number | null;
  autor: string;
  /** Perfil do autor no Google, quando existe. */
  autorUrl: string | null;
  /**
   * Foto de perfil de quem escreveu.
   *
   * É o que faz uma avaliação parecer de uma pessoa e não de uma caixa de
   * texto. Vem no próprio endereço da imagem, sem custo nem chamada extra.
   */
  autorFoto: string | null;
  /** "há 2 meses", como a Google o escreve. */
  quando: string | null;
}

/** Lê as avaliações guardadas, deitando fora as que não têm texto. */
export function lerAvaliacoes(bruto: unknown): AvaliacaoReal[] {
  if (!Array.isArray(bruto)) return [];

  return (bruto as PlaceReview[]).flatMap((avaliacao): AvaliacaoReal[] => {
    const texto = avaliacao?.text?.text ?? avaliacao?.originalText?.text ?? '';
    // Uma avaliação de estrelas sem texto não serve para nada numa página: já
    // está contada na nota e no número, e sozinha não diz nada.
    if (typeof texto !== 'string' || texto.trim() === '') return [];

    const autor = avaliacao.authorAttribution;
    return [
      {
        texto: texto.trim(),
        nota: typeof avaliacao.rating === 'number' ? avaliacao.rating : null,
        autor: autor?.displayName?.trim() || 'Cliente do Google',
        autorUrl: typeof autor?.uri === 'string' ? autor.uri : null,
        autorFoto: typeof autor?.photoUri === 'string' ? autor.photoUri : null,
        quando: avaliacao.relativePublishTimeDescription ?? null,
      },
    ];
  });
}

export interface ResultadoAvaliacoes {
  avaliacoes: AvaliacaoReal[];
  doCache: boolean;
  erro: string | null;
}

/**
 * As avaliações de um comércio, pedindo-as à Google só na primeira vez.
 *
 * Ao contrário das fotos, isto é uma consulta do escalão caro. Nunca acontece
 * sozinha: quem a manda fazer carrega num botão que diz que custa.
 */
export async function avaliacoesDoComercio(
  db: Db,
  places: PlacesClient,
  businessId: string,
  opcoes: { forcar?: boolean } = {},
): Promise<ResultadoAvaliacoes> {
  const { data: comercio } = await db
    .from('businesses')
    .select('google_place_id, google_reviews, reviews_fetched_at')
    .eq('id', businessId)
    .maybeSingle();

  if (!comercio) return { avaliacoes: [], doCache: true, erro: 'Comércio não encontrado.' };

  if (comercio.reviews_fetched_at && !opcoes.forcar) {
    return { avaliacoes: lerAvaliacoes(comercio.google_reviews), doCache: true, erro: null };
  }

  const resposta = await places.fetchReviews(comercio.google_place_id);

  if (!resposta.ok) {
    // Uma falha não se grava, senão a próxima tentativa devolvia a mesma lista
    // vazia sem sequer tentar.
    return { avaliacoes: [], doCache: false, erro: resposta.errorMessage };
  }

  await db
    .from('businesses')
    .update({
      google_reviews: resposta.reviews as never,
      reviews_fetched_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  return { avaliacoes: lerAvaliacoes(resposta.reviews), doCache: false, erro: null };
}
