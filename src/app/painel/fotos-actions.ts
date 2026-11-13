'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAlgum } from '@/lib/equipa/quem-sou';
import { getServerEnv } from '@/lib/env';
import { PlacesClient } from '@/lib/places/client';
import { fotosDoComercio, resolverUri } from '@/lib/places/fotos';
import { ehUuid } from '@/lib/emails/uuid';

/**
 * «Carregar fotos» dos cartões: a primeira foto de cada lead da página.
 *
 * Gasta dinheiro, e é só por isso que é um botão e não automático — ver
 * `grade-de-leads.tsx`. Duas consultas por lead, e cada uma só se faz se ainda
 * não estiver guardada: a lista de fotos (`fotosDoComercio`, uma vez por
 * comércio, para sempre) e o endereço da primeira (`resolverUri`, guardado).
 */

/** Uma página de cartões, no máximo. */
const MAXIMO = 100;
/** Quantos ao mesmo tempo: depressa, sem martelar a Google. */
const EM_PARALELO = 8;

export interface ResultadoDasFotos {
  carregadas: number;
  semFotos: number;
  falharam: number;
}

export async function carregarFotosDosCartoes(ids: string[]): Promise<ResultadoDasFotos> {
  await exigirAlgum(['leads', 'whatsapp']);
  const supabase = await createClient();
  const env = getServerEnv();
  const places = new PlacesClient({ apiKey: env.GOOGLE_PLACES_API_KEY });

  const validos = [...new Set(ids.filter(ehUuid))].slice(0, MAXIMO);
  const resultado: ResultadoDasFotos = { carregadas: 0, semFotos: 0, falharam: 0 };

  for (let i = 0; i < validos.length; i += EM_PARALELO) {
    await Promise.all(
      validos.slice(i, i + EM_PARALELO).map(async (id) => {
        const { fotos, erro } = await fotosDoComercio(supabase, places, id);
        if (erro) {
          resultado.falharam += 1;
          return;
        }
        const primeira = fotos[0];
        if (!primeira) {
          resultado.semFotos += 1;
          return;
        }
        const { uri } = await resolverUri(supabase, places, primeira.name);
        if (uri) resultado.carregadas += 1;
        else resultado.falharam += 1;
      }),
    );
  }

  revalidatePath('/painel/comercios');
  revalidatePath('/painel/whatsapp');
  return resultado;
}
