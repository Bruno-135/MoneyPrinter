import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { ehEstadoDeContacto } from '@/lib/deals/contacto';
import type { LinhaWhatsapp } from './lista';

type Db = SupabaseClient<Database>;

/** O PostgREST corta cada resposta às mil linhas, por muito que se peça. */
const PAGINA = 1000;
/** Tecto de segurança: acima disto algo está errado, ou é hora de mudar de abordagem. */
const MAXIMO_DE_LINHAS = 50_000;

const COLUNAS =
  'id, name, business_category, country_code, locality, score, phone_e164, estado_do_contacto, falado_em, emailado_em, first_seen_at, website_kind';

function maisRecente(a: string | null, b: string | null): string | null {
  if (a && b) return new Date(a) >= new Date(b) ? a : b;
  return a ?? b ?? null;
}

/**
 * Todos os leads com telefone, em páginas de mil. A ordem por `id` é só para
 * a paginação ser estável: sem ela, uma linha podia aparecer em duas páginas
 * e outra em nenhuma.
 */
export async function lerLinhasWhatsapp(db: Db): Promise<LinhaWhatsapp[]> {
  const linhas: LinhaWhatsapp[] = [];

  for (let de = 0; de < MAXIMO_DE_LINHAS; de += PAGINA) {
    const { data, error } = await db
      .from('businesses_with_stage')
      .select(COLUNAS)
      .eq('is_archived', false)
      .not('phone_e164', 'is', null)
      .order('id')
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(`Não foi possível ler os leads: ${error.message}`);

    for (const r of data ?? []) {
      if (!r.phone_e164) continue;
      linhas.push({
        id: r.id,
        nome: r.name,
        ramo: r.business_category,
        pais: r.country_code,
        cidade: r.locality,
        score: r.score,
        telefone: r.phone_e164,
        contacto: ehEstadoDeContacto(r.estado_do_contacto) ? r.estado_do_contacto : 'por_contactar',
        contactadoEm: maisRecente(r.falado_em, r.emailado_em),
        adicionadoEm: r.first_seen_at,
        presenca:
          r.website_kind === 'real' || r.website_kind === 'social_only' ? r.website_kind : 'none',
      });
    }
    if ((data ?? []).length < PAGINA) break;
  }
  return linhas;
}
