import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { buildContent, templateFor, type SiteContent, type SiteTemplate } from './content';
import { themeForBusiness, type SiteTheme } from './theme';

/**
 * Criação e gestão das landing pages.
 *
 * Regra que atravessa isto: a página pública lê-se do JSON em `content`, nunca
 * da tabela `businesses`. Um visitante anónimo não tem — e não pode ter —
 * acesso aos comércios: essa é a tua lista de prospeção. Tudo o que a página
 * mostra tem de estar no JSON no momento em que é gerada.
 */

type Db = SupabaseClient<Database>;
type Site = Database['public']['Tables']['generated_sites']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export interface SiteSummary {
  id: string;
  template: SiteTemplate;
  status: Database['public']['Enums']['site_status'];
  publicCode: string;
  publishedAt: string | null;
  expiresAt: string | null;
  isLive: boolean;
  menuItemCount: number;
}

/** Cria a página a partir dos dados do comércio, em rascunho. */
export async function generateSite(db: Db, businessId: string): Promise<string> {
  const { data: business, error: readError } = await db
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (readError || !business) {
    throw new Error(`Comércio não encontrado: ${readError?.message ?? 'sem dados'}`);
  }

  const template = templateFor(business);
  const content = buildContent(business, template);

  // A paleta é um palpite a partir do ramo, não uma escolha definitiva: o
  // editor muda-a num clique. Serve para uma floricultura não nascer com as
  // cores de uma padaria só porque foi esse o primeiro modelo que se fez. A
  // família das imagens geradas sai do mesmo sítio, pela mesma razão.
  const theme: SiteTheme = themeForBusiness(business.google_types, business.business_category);

  const { data, error } = await db
    .from('generated_sites')
    .insert({
      business_id: businessId,
      template,
      status: 'draft',
      title: business.name,
      content: content as never,
      theme: theme as never,
      whatsapp_number_e164: business.phone_e164,
      whatsapp_country: business.phone_country,
      whatsapp_greeting: content.ordering?.greeting ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível gerar a página: ${error?.message ?? 'sem dados'}`);
  }

  return data.id;
}

/**
 * Grava o conteúdo e o tema editados.
 *
 * Escreve o JSON inteiro de uma vez em vez de campo a campo. O conteúdo é um
 * documento, não um conjunto de colunas: gravar metade dele deixaria a página
 * num estado que nenhum ecrã produziu.
 *
 * `title` acompanha o título da capa porque é o que aparece no separador do
 * browser e nas partilhas — se divergirem, o comerciante manda o link e vê
 * outro nome.
 */
export async function updateSiteContent(
  db: Db,
  siteId: string,
  content: SiteContent,
  theme: SiteTheme,
  whatsappGreeting: string | null,
): Promise<void> {
  const { error } = await db
    .from('generated_sites')
    .update({
      title: content.hero.headline,
      content: content as never,
      theme: theme as never,
      whatsapp_greeting: whatsappGreeting,
    })
    .eq('id', siteId);

  if (error) throw new Error(`Não foi possível guardar: ${error.message}`);
}

/**
 * Grava o resultado de uma geração por IA.
 *
 * `customHtml` a `null` significa modo "preencher campos": a página volta a ser
 * uma página normal, editável campo a campo. Passar HTML muda-a para o outro
 * modo. É a mesma função para os dois porque o que se grava a seguir — modelo,
 * pedido, tokens — é igual, e separá-la em duas duplicava essa parte.
 */
export async function saveAiGeneration(
  db: Db,
  siteId: string,
  input: {
    content: SiteContent;
    theme: SiteTheme;
    customHtml: string | null;
    model: string;
    brief: string;
    inputTokens: number;
    outputTokens: number;
  },
): Promise<void> {
  const { error } = await db
    .from('generated_sites')
    .update({
      title: input.content.hero.headline,
      content: input.content as never,
      theme: input.theme as never,
      custom_html: input.customHtml,
      ai_model: input.model,
      ai_brief: input.brief || null,
      ai_generated_at: new Date().toISOString(),
      ai_input_tokens: input.inputTokens,
      ai_output_tokens: input.outputTokens,
    })
    .eq('id', siteId);

  if (error) throw new Error(`Não foi possível guardar a geração: ${error.message}`);
}

/**
 * Volta ao modo de campos, deitando fora o HTML gerado.
 *
 * Existe porque o caminho inverso não é simétrico: gerar HTML apaga a
 * possibilidade de editar por campos, e sem uma forma de voltar atrás a única
 * saída seria apagar a página e começar do zero — perdendo o código público,
 * que pode já ter sido enviado ao comerciante.
 */
export async function discardCustomHtml(db: Db, siteId: string): Promise<void> {
  const { error } = await db
    .from('generated_sites')
    .update({ custom_html: null })
    .eq('id', siteId);

  if (error) throw new Error(`Não foi possível voltar ao modelo: ${error.message}`);
}

export async function publishSite(db: Db, siteId: string, ttlDays: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();

  const { error } = await db
    .from('generated_sites')
    .update({ status: 'published', published_at: new Date().toISOString(), expires_at: expiresAt })
    .eq('id', siteId);

  if (error) throw new Error(`Não foi possível publicar: ${error.message}`);
}

export async function unpublishSite(db: Db, siteId: string): Promise<void> {
  const { error } = await db.from('generated_sites').update({ status: 'draft' }).eq('id', siteId);
  if (error) throw new Error(`Não foi possível despublicar: ${error.message}`);
}

export async function deleteSite(db: Db, siteId: string): Promise<void> {
  const { error } = await db.from('generated_sites').delete().eq('id', siteId);
  if (error) throw new Error(`Não foi possível apagar: ${error.message}`);
}

function toSummary(site: Site, menuItemCount: number): SiteSummary {
  return {
    id: site.id,
    template: site.template,
    status: site.status,
    publicCode: site.public_code,
    publishedAt: site.published_at,
    expiresAt: site.expires_at,
    isLive: site.status === 'published' && new Date(site.expires_at) > new Date(),
    menuItemCount,
  };
}

export async function listSites(db: Db, businessId: string): Promise<SiteSummary[]> {
  const { data } = await db
    .from('generated_sites')
    .select('*, menu_items(count)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => {
    const { menu_items, ...site } = row as Site & { menu_items?: { count: number }[] };
    return toSummary(site as Site, menu_items?.[0]?.count ?? 0);
  });
}

export async function getSiteById(db: Db, siteId: string): Promise<Site | null> {
  const { data } = await db.from('generated_sites').select('*').eq('id', siteId).maybeSingle();
  return data;
}

/**
 * Lê a página pelo código público.
 *
 * Não filtra por estado nem por validade: é a RLS que decide o que um visitante
 * anónimo pode ver. Duplicar aqui a regra que já está na base de dados criaria
 * duas verdades que podem divergir.
 */
export async function getPublicSite(
  db: Db,
  publicCode: string,
): Promise<{ site: Site; menu: MenuItem[] } | null> {
  const { data: site } = await db
    .from('generated_sites')
    .select('*')
    .eq('public_code', publicCode)
    .maybeSingle();

  if (!site) return null;

  const { data: menu } = await db
    .from('menu_items')
    .select('*')
    .eq('site_id', site.id)
    .order('section')
    .order('position')
    .order('name');

  return { site, menu: menu ?? [] };
}

// ---------------------------------------------------------------------------
// Cardápio
// ---------------------------------------------------------------------------

export async function listMenuItems(db: Db, siteId: string): Promise<MenuItem[]> {
  const { data } = await db
    .from('menu_items')
    .select('*')
    .eq('site_id', siteId)
    .order('section')
    .order('position')
    .order('name');

  return data ?? [];
}

export interface MenuItemInput {
  section: string;
  name: string;
  description?: string | null;
  priceCents?: number | null;
  currency?: string;
  position?: number;
}

export async function addMenuItem(db: Db, siteId: string, item: MenuItemInput): Promise<void> {
  const { error } = await db.from('menu_items').insert({
    site_id: siteId,
    section: item.section.trim() || 'Geral',
    name: item.name.trim(),
    description: item.description?.trim() || null,
    price_cents: item.priceCents ?? null,
    currency: item.currency ?? 'EUR',
    position: item.position ?? 0,
  });

  // O trigger da migração 0004 recusa itens em páginas que não sejam
  // food_service. A mensagem crua do Postgres não ajuda quem está no ecrã.
  if (error) {
    throw new Error(
      error.message.includes('food_service')
        ? 'Esta página não é do modelo com cardápio. Só restaurantes e padarias o têm.'
        : `Não foi possível acrescentar o item: ${error.message}`,
    );
  }
}

export async function deleteMenuItem(db: Db, itemId: string): Promise<void> {
  const { error } = await db.from('menu_items').delete().eq('id', itemId);
  if (error) throw new Error(`Não foi possível apagar o item: ${error.message}`);
}

/** Preço em cêntimos a partir do que a pessoa escreveu ("2,50", "2.50", "250"). */
export function parsePrice(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const normalized = trimmed.replace(/[^\d,.]/g, '').replace(',', '.');

  // Sem esta guarda, um texto sem dígitos ("abc") ficaria em '' e `Number('')`
  // é zero — o item aparecia no cardápio do comerciante a custar 0,00 €.
  // Um "0" escrito de propósito continua a valer zero, que é legítimo.
  if (!/\d/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

export function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return '';

  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(cents / 100);
}
