import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export interface PaginaDoSite {
  id: string;
  slug: string;
  titulo: string;
  html: string | null;
  ordem: number;
  geradaEm: string | null;
}

/** O que a inicial mostra no menu. Não é uma linha da tabela: é a raiz. */
export const INICIAL = { slug: '', titulo: 'Início' } as const;

function montar(linha: Database['public']['Tables']['site_pages']['Row']): PaginaDoSite {
  return {
    id: linha.id,
    slug: linha.slug,
    titulo: linha.title,
    html: linha.custom_html,
    ordem: linha.ordem,
    geradaEm: linha.ai_generated_at,
  };
}

export async function paginasDoSite(db: Db, siteId: string): Promise<PaginaDoSite[]> {
  const { data, error } = await db
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Não foi possível ler as páginas: ${error.message}`);
  return (data ?? []).map(montar);
}

export async function paginaPorSlug(
  db: Db,
  siteId: string,
  slug: string,
): Promise<PaginaDoSite | null> {
  const { data, error } = await db
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível ler a página: ${error.message}`);
  return data ? montar(data) : null;
}

export async function paginaPorId(db: Db, id: string): Promise<PaginaDoSite | null> {
  const { data, error } = await db.from('site_pages').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Não foi possível ler a página: ${error.message}`);
  return data ? montar(data) : null;
}

/**
 * O endereço a partir da raiz, para o menu e para os links entre páginas.
 *
 * Absoluto e não relativo: o sanitizador deixa passar `href` que comece por
 * `/`, e um link relativo escrito numa página quebrava assim que essa página
 * mudasse de nível.
 */
export function enderecoDaPagina(publicCode: string, slug: string): string {
  return slug ? `/s/${publicCode}/${slug}` : `/s/${publicCode}`;
}

export async function criarPagina(
  db: Db,
  siteId: string,
  dados: { slug: string; titulo: string; ordem?: number },
): Promise<string> {
  const { data, error } = await db
    .from('site_pages')
    .insert({
      site_id: siteId,
      slug: dados.slug,
      title: dados.titulo,
      ordem: dados.ordem ?? 0,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 é a violação da chave única (site_id, slug). A mensagem crua do
    // Postgres não diz nada a quem está a criar uma página.
    if (error.code === '23505') {
      throw new Error(`Já existe uma página com o endereço "${dados.slug}" neste site.`);
    }
    throw new Error(`Não foi possível criar a página: ${error.message}`);
  }

  return data.id;
}

export async function gravarHtmlDaPagina(
  db: Db,
  id: string,
  html: string,
  ia: { modelo: string; brief: string; entrada: number; saida: number },
): Promise<void> {
  const { error } = await db
    .from('site_pages')
    .update({
      custom_html: html,
      ai_model: ia.modelo,
      ai_brief: ia.brief,
      ai_generated_at: new Date().toISOString(),
      ai_input_tokens: ia.entrada,
      ai_output_tokens: ia.saida,
    })
    .eq('id', id);

  if (error) throw new Error(`Não foi possível gravar a página: ${error.message}`);
}

export async function renomearPagina(
  db: Db,
  id: string,
  dados: { titulo: string; ordem: number },
): Promise<void> {
  const { error } = await db
    .from('site_pages')
    .update({ title: dados.titulo, ordem: dados.ordem })
    .eq('id', id);

  if (error) throw new Error(`Não foi possível gravar: ${error.message}`);
}

export async function apagarPagina(db: Db, id: string): Promise<void> {
  const { error } = await db.from('site_pages').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível apagar a página: ${error.message}`);
}

/**
 * O menu do site, para a IA escrever em cada página.
 *
 * Inclui sempre a inicial, que não é uma linha da tabela. `slugAtual` é `''`
 * quando se está a gerar a inicial.
 *
 * Só entram páginas que já existem — mesmo as ainda por gerar, porque o menu
 * tem de ser o mesmo em todas e ninguém gera seis páginas ao mesmo tempo. O
 * que a rota pública faz com uma página do menu ainda vazia é devolver 404,
 * que é o mal menor entre um link partido e uma folha branca.
 */
export function menuDoSite(
  publicCode: string,
  paginas: readonly PaginaDoSite[],
  slugAtual: string,
): Array<{ titulo: string; endereco: string; atual: boolean }> {
  return [
    {
      titulo: INICIAL.titulo,
      endereco: enderecoDaPagina(publicCode, INICIAL.slug),
      atual: slugAtual === INICIAL.slug,
    },
    ...paginas.map((p) => ({
      titulo: p.titulo,
      endereco: enderecoDaPagina(publicCode, p.slug),
      atual: p.slug === slugAtual,
    })),
  ];
}

/**
 * Transforma um título em endereço.
 *
 * "Moda Mulher" → "moda-mulher". Não substitui a escolha de quem cria a
 * página: é a sugestão que aparece no campo, e que a maior parte das vezes é
 * a que fica.
 */
export function sugerirSlug(titulo: string): string {
  const semAcentos = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  return semAcentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}
