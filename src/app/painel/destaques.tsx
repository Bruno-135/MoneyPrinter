import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { lerFotosGuardadas, LARGURA_FOTO } from '@/lib/places/fotos';

/**
 * As fotografias dos cartões de leads, só do que já está pago e guardado.
 *
 * Aqui viviam também os três cartões «Comece por estes» da lista de Leads,
 * que saíram a pedido do dono: a lista em cartões (`grade-de-leads.tsx`) faz o
 * mesmo para a página toda.
 *
 * As fotografias saem do cache e NUNCA da Google. Estes ecrãs abrem-se dezenas
 * de vezes por dia; ir buscar fotos aqui era transformar uma lista em despesa
 * recorrente. Quem quer fotos novas carrega no «Carregar fotos».
 */

type Db = SupabaseClient<Database>;

export interface FotoDeCartao {
  url: string;
  /** true quando é a loja a sério, e não o fundo desenhado. */
  real: boolean;
}

/**
 * A fotografia de cada comércio, só do que já está pago e guardado.
 *
 * Pede-se apenas o `id` de propósito: além dos três cartões do painel, a
 * ficha do comércio precisa exatamente do mesmo — a foto em cache ou nada — e
 * duas funções a fazer isto seriam duas maneiras de gastar dinheiro sem dar
 * por isso.
 */
export async function fotosDosDestaques(
  db: Db,
  destaques: readonly { id: string }[],
): Promise<Map<string, FotoDeCartao>> {
  const porComercio = new Map<string, FotoDeCartao>();
  if (destaques.length === 0) return porComercio;

  const { data: comercios } = await db
    .from('businesses')
    .select('id, google_photos, photos_fetched_at')
    .in(
      'id',
      destaques.map((d) => d.id),
    );

  // Os endereços que já foram pagos alguma vez. Sem validade: aqui é melhor
  // uma fotografia talvez velha do que um pedido novo a cada abertura do
  // painel — e se o endereço tiver expirado, cai-se na imagem gerada.
  const nomes = (comercios ?? []).flatMap((c) =>
    c.photos_fetched_at ? lerFotosGuardadas(c.google_photos).slice(0, 1).map((f) => f.name) : [],
  );

  const { data: enderecos } = nomes.length
    ? await db
        .from('google_photo_uris')
        .select('photo_name, photo_uri')
        .eq('max_width_px', LARGURA_FOTO)
        .in('photo_name', nomes)
    : { data: [] };

  const porNome = new Map((enderecos ?? []).map((e) => [e.photo_name, e.photo_uri]));

  for (const comercio of comercios ?? []) {
    const primeira = comercio.photos_fetched_at
      ? lerFotosGuardadas(comercio.google_photos)[0]
      : undefined;
    const endereco = primeira ? porNome.get(primeira.name) : undefined;
    if (endereco) porComercio.set(comercio.id, { url: endereco, real: true });
  }

  return porComercio;
}
