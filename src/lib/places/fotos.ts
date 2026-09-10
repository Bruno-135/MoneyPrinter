import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PlacesClient } from './client';
import type { PlacePhoto } from './types';

/**
 * As fotografias do próprio comércio, vindas do Google.
 *
 * É a diferença entre uma página bonita e uma proposta que convence: o dono
 * abre o site e vê a LOJA dele, não uma padaria genérica de outro país.
 *
 * Duas coisas separadas, e é a separação que faz isto ser barato:
 *
 *  1. a LISTA de fotos de um comércio — uma consulta, uma vez, e só para os
 *     comércios a que se vai mesmo fazer site. Fica gravada e não caduca.
 *  2. o ENDEREÇO de cada foto — a Google só o dá a pedido e ele expira. Fica
 *     gravado com validade, para a mesma foto não se pagar duas vezes no
 *     mesmo dia.
 *
 * Nenhuma imagem passa por aqui. O que se guarda são nomes, endereços e o
 * crédito de quem tirou a foto — que tem de aparecer na página, e por isso
 * viaja agarrado desde o início.
 */

type Db = SupabaseClient<Database>;

/** Largura única para tudo. Ver `resolverUri` para a razão. */
export const LARGURA_FOTO = 1600;

/** Quanto tempo se confia num endereço antes de o pedir outra vez. */
const VALIDADE_HORAS = 20;

export interface FotoDoComercio {
  name: string;
  larguraPx: number;
  alturaPx: number;
  /** "Foto de Fulano · Google" — o crédito, como tem de aparecer. */
  credito: string;
  /** Perfil de quem tirou a foto, quando a Google o dá. */
  creditoUrl: string | null;
}

/** Lê a lista guardada, deitando fora o que não tem nome utilizável. */
export function lerFotosGuardadas(bruto: unknown): FotoDoComercio[] {
  if (!Array.isArray(bruto)) return [];

  return (bruto as PlacePhoto[]).flatMap((foto): FotoDoComercio[] => {
    if (typeof foto?.name !== 'string' || foto.name.trim() === '') return [];

    const autor = foto.authorAttributions?.[0];
    return [
      {
        name: foto.name,
        larguraPx: foto.widthPx ?? 0,
        alturaPx: foto.heightPx ?? 0,
        credito: `Foto de ${autor?.displayName?.trim() || 'um cliente'} · Google`,
        creditoUrl: typeof autor?.uri === 'string' ? autor.uri : null,
      },
    ];
  });
}

export interface ResultadoFotos {
  fotos: FotoDoComercio[];
  /** true quando não custou nada — já estavam guardadas. */
  doCache: boolean;
  erro: string | null;
}

/**
 * A lista de fotos de um comércio, pedindo-a à Google só na primeira vez.
 *
 * `forcar` volta a pedir, para quando o comerciante diz que pôs fotos novas.
 * Sem isso, esta função nunca gasta duas vezes pelo mesmo comércio.
 */
export async function fotosDoComercio(
  db: Db,
  places: PlacesClient,
  businessId: string,
  opcoes: { forcar?: boolean } = {},
): Promise<ResultadoFotos> {
  const { data: comercio } = await db
    .from('businesses')
    .select('google_place_id, google_photos, photos_fetched_at')
    .eq('id', businessId)
    .maybeSingle();

  if (!comercio) return { fotos: [], doCache: true, erro: 'Comércio não encontrado.' };

  if (comercio.photos_fetched_at && !opcoes.forcar) {
    return { fotos: lerFotosGuardadas(comercio.google_photos), doCache: true, erro: null };
  }

  const resposta = await places.fetchPhotos(comercio.google_place_id);

  if (!resposta.ok) {
    // Uma falha não se grava: gravá-la ensinaria o sistema a responder "este
    // comércio não tem fotos" para sempre a uma consulta que correu mal uma vez.
    return { fotos: [], doCache: false, erro: resposta.errorMessage };
  }

  // Uma resposta vazia GRAVA-SE, ao contrário de uma falha. "Este comércio não
  // tem fotos no Google" é uma resposta verdadeira, e voltar a perguntá-la
  // todas as vezes era pagar para ouvir o mesmo.
  await db
    .from('businesses')
    .update({
      google_photos: resposta.photos as never,
      photos_fetched_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  return { fotos: lerFotosGuardadas(resposta.photos), doCache: false, erro: null };
}

/**
 * O endereço de uma foto, do cache ou da Google.
 *
 * Uma largura só para tudo — miniatura e página — de propósito: cada largura
 * diferente é outra consulta paga pela MESMA fotografia. Encolher uma imagem
 * grande é trabalho do browser e não custa nada; pedir duas é dinheiro a
 * dobrar.
 */
export async function resolverUri(
  db: Db,
  places: PlacesClient,
  photoName: string,
): Promise<{ uri: string | null; doCache: boolean; erro: string | null }> {
  const limite = new Date(Date.now() - VALIDADE_HORAS * 3600_000).toISOString();

  const { data: guardado } = await db
    .from('google_photo_uris')
    .select('photo_uri, fetched_at')
    .eq('photo_name', photoName)
    .eq('max_width_px', LARGURA_FOTO)
    .maybeSingle();

  if (guardado && guardado.fetched_at > limite) {
    return { uri: guardado.photo_uri, doCache: true, erro: null };
  }

  const resposta = await places.fetchPhotoUri(photoName, LARGURA_FOTO);
  if (!resposta.ok || !resposta.uri) {
    // Sem endereço novo, vale mais o velho do que nada: uma imagem que talvez
    // já não abra é melhor do que um buraco garantido na página.
    if (guardado) return { uri: guardado.photo_uri, doCache: true, erro: null };
    return { uri: null, doCache: false, erro: resposta.errorMessage };
  }

  await db.from('google_photo_uris').upsert(
    {
      photo_name: photoName,
      max_width_px: LARGURA_FOTO,
      photo_uri: resposta.uri,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,photo_name,max_width_px' },
  );

  return { uri: resposta.uri, doCache: false, erro: null };
}
