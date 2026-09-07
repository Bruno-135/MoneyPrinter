import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getSiteById, listMenuItems } from './repository';
import { parseContent, type SiteContent } from './content';
import { parseTheme, type SiteTheme } from './theme';

/**
 * Carrega uma página gerada com tudo o que é preciso para a desenhar.
 *
 * A pré-visualização, o PDF e o editor precisam exatamente do mesmo conjunto —
 * o site, o conteúdo já lido, o tema e o cardápio. Sem isto, cada um deles
 * repetia as mesmas quatro chamadas e mais tarde divergiam.
 *
 * Ao contrário de `getPublicSite`, isto lê pelo `id` e não pelo código público:
 * quem chega aqui é o dono, autenticado, e a RLS deixa-o ver os rascunhos.
 */

type Db = SupabaseClient<Database>;
type Site = Database['public']['Tables']['generated_sites']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export interface LoadedSite {
  site: Site;
  content: SiteContent;
  theme: SiteTheme;
  menu: MenuItem[];
  isFoodService: boolean;
}

export async function loadSite(db: Db, siteId: string): Promise<LoadedSite | null> {
  const site = await getSiteById(db, siteId);
  if (!site) return null;

  const content = parseContent(site.content);
  if (!content) return null;

  const isFoodService = site.template === 'food_service';
  const menu = isFoodService ? await listMenuItems(db, siteId) : [];

  return { site, content, theme: parseTheme(site.theme), menu, isFoodService };
}
