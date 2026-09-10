import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { RankedBusiness } from '@/lib/scoring/rank';
import { findCategory } from '@/lib/places/categories';
import { arteUrl, familiaParaRamo } from '@/lib/sites/imagens/arte';
import { lerFotosGuardadas, LARGURA_FOTO } from '@/lib/places/fotos';

/**
 * Os três por onde começar hoje.
 *
 * Uma lista de novecentos comércios ordenada por pontuação é verdadeira e
 * inútil: ninguém abre um painel para ler novecentas linhas. Estes três são a
 * mesma lista com uma pergunta feita por ela — "por qual começo?" — e a
 * resposta em três cartões que se veem de uma vez.
 *
 * São os três de melhor pontuação que ainda não foram contactados, dentro dos
 * filtros que estiverem postos. Mudam sozinhos à medida que se vai
 * contactando: quem passa a "contactado" sai daqui e entra o seguinte.
 *
 * As fotografias saem do cache e NUNCA da Google. Este ecrã abre-se dezenas de
 * vezes por dia; ir buscar fotos aqui era transformar uma lista em despesa
 * recorrente. Quem ainda não tem foto guardada mostra a imagem gerada do ramo,
 * que não custa nada e nunca falha.
 */

type Db = SupabaseClient<Database>;

interface FotoDeCartao {
  url: string;
  /** true quando é a loja a sério, e não o fundo desenhado. */
  real: boolean;
}

export async function fotosDosDestaques(
  db: Db,
  destaques: readonly RankedBusiness[],
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

export function Destaques({
  destaques,
  fotos,
}: {
  destaques: readonly RankedBusiness[];
  fotos: Map<string, FotoDeCartao>;
}) {
  if (destaques.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-wide text-brand-600 uppercase">
          Comece por estes
        </h2>
        <p className="text-sm opacity-55">
          Melhor pontuação, ainda por contactar. Saem daqui assim que os contactares.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {destaques.map((b) => {
          const foto = fotos.get(b.id);
          const imagem = foto?.url ?? arteUrl(familiaParaRamo(b.category), b.id);

          return (
            <li
              key={b.id}
              className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
            >
              <Link href={`/painel/comercio/${b.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagem}
                  alt={foto?.real ? `Fotografia de ${b.name}` : ''}
                  className="aspect-16/10 w-full bg-black/10 object-cover"
                  loading="lazy"
                />
                <div className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold tabular-nums">{b.score}</span>
                    {b.rating !== null && (
                      <span className="text-sm tabular-nums opacity-60">
                        {b.rating.toFixed(1).replace('.', ',')} ★
                        {b.reviewsCount !== null && ` · ${b.reviewsCount}`}
                      </span>
                    )}
                  </div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm opacity-60">
                    {findCategory(b.category)?.label ?? b.category}
                    {b.locality && ` · ${b.locality}`}
                  </p>
                  {!foto?.real && (
                    <p className="text-xs opacity-45">
                      Sem fotografia ainda — vai-se buscá-la ao fazer o site.
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
