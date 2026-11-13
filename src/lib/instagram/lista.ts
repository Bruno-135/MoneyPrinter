import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { ehEstadoDeContacto, type EstadoDoContacto } from '@/lib/deals/contacto';
import { utilizadorDoInstagram } from './perfil';

type Db = SupabaseClient<Database>;

/** Um lead com Instagram, como a Lista de Instagram o mostra. */
export interface LinhaInstagram {
  id: string;
  nome: string;
  ramo: string;
  pais: string;
  cidade: string | null;
  score: number;
  /** Sem `@`, em minúsculas. */
  utilizador: string;
  presenca: 'none' | 'social_only' | 'real';
  contacto: EstadoDoContacto;
  /** Já recebeu o WhatsApp da lista (sozinho ou com e-mail). */
  recebeuWhatsapp: boolean;
  nota: number | null;
  avaliacoes: number | null;
}

const COLUNAS =
  'id, name, business_category, country_code, locality, score, website_url, website_kind, social_links, estado_do_contacto, rating, reviews_count';

/**
 * Todos os leads com perfil de Instagram, em páginas de mil (como a Lista de
 * WhatsApp). O perfil sai de `social_links.instagram` e, à falta dele, do
 * próprio endereço do site, se for um Instagram.
 */
export async function lerLinhasInstagram(db: Db): Promise<LinhaInstagram[]> {
  const linhas: LinhaInstagram[] = [];

  for (let de = 0; de < 50_000; de += 1000) {
    const { data, error } = await db
      .from('businesses_with_stage')
      .select(COLUNAS)
      .eq('is_archived', false)
      .eq('has_social', true)
      .order('id')
      .range(de, de + 999);
    if (error) throw new Error(`Não foi possível ler os leads: ${error.message}`);

    for (const r of data ?? []) {
      const redes = (r.social_links ?? {}) as Record<string, unknown>;
      const endereco = typeof redes.instagram === 'string' ? redes.instagram : r.website_url;
      const utilizador = utilizadorDoInstagram(endereco);
      if (!utilizador || !r.id) continue;
      const contacto = ehEstadoDeContacto(r.estado_do_contacto)
        ? r.estado_do_contacto
        : 'por_contactar';
      linhas.push({
        id: r.id,
        nome: r.name ?? '',
        ramo: r.business_category ?? '',
        pais: r.country_code ?? 'PT',
        cidade: r.locality,
        score: r.score ?? 0,
        utilizador,
        presenca:
          r.website_kind === 'real' || r.website_kind === 'social_only' ? r.website_kind : 'none',
        contacto,
        recebeuWhatsapp: contacto === 'whatsapp_enviado' || contacto === 'email_e_whatsapp',
        nota: r.rating,
        avaliacoes: r.reviews_count,
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  return linhas;
}
