import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Estado, Foto, Peca } from './peca';

type Db = SupabaseClient<Database>;
type Linha = Database['public']['Tables']['site_products']['Row'];

/** Lê o que vem do jsonb sem confiar nele. Um catálogo mal gravado não parte a página. */
function lerFotos(bruto: unknown): Foto[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((f): f is { url: unknown; alt?: unknown } => typeof f === 'object' && f !== null)
    .map((f) => ({
      url: typeof f.url === 'string' ? f.url : '',
      alt: typeof f.alt === 'string' ? f.alt : '',
    }))
    .filter((f) => f.url !== '');
}

function lerFicha(bruto: unknown): Record<string, string> {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return {};
  const saida: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(bruto)) {
    if (typeof valor === 'string' && valor.trim() !== '') saida[chave] = valor;
  }
  return saida;
}

function montar(l: Linha): Peca {
  return {
    id: l.id,
    ref: l.ref,
    nome: l.name,
    descricao: l.description,
    precoCentimos: l.price_cents,
    precoAnteriorCentimos: l.old_price_cents,
    moeda: l.currency,
    familia: l.familia,
    tipo: l.tipo,
    // O CHECK da base só deixa entrar estes três, mas o tipo vem como texto.
    estado: l.estado as Estado,
    notaDoEstado: l.nota_do_estado,
    tamanhos: l.tamanhos,
    cor: l.cor,
    ficha: lerFicha(l.ficha),
    fotos: lerFotos(l.fotos),
    esgotado: l.esgotado,
    destaque: l.destaque,
  };
}

/**
 * O catálogo de um site.
 *
 * As esgotadas vêm no fim e não de fora: uma montra sem nada esgotado parece
 * uma loja parada, e ver o que já saiu é o que faz a pessoa perguntar depressa
 * pelo que ainda lá está.
 */
export async function catalogo(db: Db, siteId: string): Promise<Peca[]> {
  const { data, error } = await db
    .from('site_products')
    .select('*')
    .eq('site_id', siteId)
    .order('esgotado', { ascending: true })
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Não foi possível ler o catálogo: ${error.message}`);
  return (data ?? []).map(montar);
}

export async function pecaPorRef(db: Db, siteId: string, ref: string): Promise<Peca | null> {
  const { data, error } = await db
    .from('site_products')
    .select('*')
    .eq('site_id', siteId)
    .eq('ref', ref)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível ler a peça: ${error.message}`);
  return data ? montar(data) : null;
}

export interface PecaParaGravar {
  ref: string;
  nome: string;
  descricao: string | null;
  precoCentimos: number | null;
  precoAnteriorCentimos: number | null;
  moeda: string;
  familia: string | null;
  tipo: string | null;
  estado: Estado;
  notaDoEstado: string | null;
  tamanhos: string[];
  cor: string | null;
  fotos: Foto[];
  esgotado: boolean;
  destaque: boolean;
}

function paraLinha(siteId: string, p: PecaParaGravar) {
  return {
    site_id: siteId,
    ref: p.ref,
    name: p.nome,
    description: p.descricao,
    price_cents: p.precoCentimos,
    old_price_cents: p.precoAnteriorCentimos,
    currency: p.moeda,
    familia: p.familia,
    tipo: p.tipo,
    estado: p.estado,
    nota_do_estado: p.notaDoEstado,
    tamanhos: p.tamanhos,
    cor: p.cor,
    // `Foto` é um tipo fechado e `Json` exige uma assinatura de índice; o
    // que vai para a base é exactamente a mesma forma, e é o `select` que a
    // volta a validar na leitura.
    fotos: p.fotos.map((f) => ({ url: f.url, alt: f.alt })),
    esgotado: p.esgotado,
    destaque: p.destaque,
  };
}

export async function criarPeca(db: Db, siteId: string, p: PecaParaGravar): Promise<void> {
  const { error } = await db.from('site_products').insert(paraLinha(siteId, p));

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe uma peça com a referência "${p.ref}" nesta loja.`);
    }
    throw new Error(`Não foi possível gravar a peça: ${error.message}`);
  }
}

export async function actualizarPeca(
  db: Db,
  id: string,
  siteId: string,
  p: PecaParaGravar,
): Promise<void> {
  const { error } = await db.from('site_products').update(paraLinha(siteId, p)).eq('id', id);
  if (error) throw new Error(`Não foi possível gravar a peça: ${error.message}`);
}

export async function apagarPeca(db: Db, id: string): Promise<void> {
  const { error } = await db.from('site_products').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível apagar a peça: ${error.message}`);
}

/** Marca ou desmarca como esgotada, sem apagar: a peça pode voltar. */
export async function marcarEsgotada(db: Db, id: string, esgotada: boolean): Promise<void> {
  const { error } = await db.from('site_products').update({ esgotado: esgotada }).eq('id', id);
  if (error) throw new Error(`Não foi possível gravar: ${error.message}`);
}
