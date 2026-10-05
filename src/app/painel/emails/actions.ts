'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso } from '@/lib/equipa/quem-sou';
import { emailDoSite } from '@/lib/emails/recolher';
import { contagens, gravarAchado, proximosPorVer, voltarAVer } from '@/lib/emails/repository';
import type { Lote } from './estado';

/**
 * Um lote da extração: abre alguns sites, grava o que achou, diz quantos faltam.
 *
 * É um lote e não «todos» porque uma função num servidor tem tempo contado, e
 * 1400 sites a 5 s cada não cabem. O ecrã chama isto em ciclo até não faltar
 * nenhum — e se a janela fechar a meio, o que ficou gravado fica gravado e a
 * próxima vez continua de onde parou.
 */

const POR_LOTE = 10;
const AO_MESMO_TEMPO = 5;

export async function extrairLote(): Promise<Lote> {
  await exigirAcesso('emails');
  const supabase = await createClient();

  try {
    const fila = await proximosPorVer(supabase, POR_LOTE);
    let comEmail = 0;

    for (let i = 0; i < fila.length; i += AO_MESMO_TEMPO) {
      await Promise.all(
        fila.slice(i, i + AO_MESMO_TEMPO).map(async (item) => {
          const achado = await emailDoSite(item.site);
          // Grava-se SEMPRE, também quando não abriu ou não tem e-mail: é a
          // data que tira o lead do filtro «não extraído». Sem isto, um site
          // em baixo voltava em todos os lotes e o ciclo nunca acabava.
          await gravarAchado(supabase, item.id, achado);
          if (achado.email) comEmail++;
        }),
      );
    }

    const c = await contagens(supabase);
    return { vistos: fila.length, comEmail, porExtrair: c.nao_extraido };
  } catch (e) {
    return {
      vistos: 0,
      comEmail: 0,
      porExtrair: -1,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Os sites que não abriram voltam ao filtro «não extraído». */
export async function tentarDeNovoOsQueNaoAbriram(): Promise<number> {
  await exigirAcesso('emails');
  const supabase = await createClient();
  const n = await voltarAVer(supabase);
  revalidatePath('/painel/emails');
  return n;
}
