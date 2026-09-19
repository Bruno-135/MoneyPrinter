'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AiActionState } from '@/lib/ai/action-state';
import {
  actualizarPeca,
  apagarPeca,
  criarPeca,
  marcarEsgotada,
  type PecaParaGravar,
} from '@/lib/loja/repository';
import type { Estado } from '@/lib/loja/peca';
import { lerPreco, lerTamanhos } from '@/lib/loja/campos';
import { filtrarEnderecos } from '@/lib/loja/imagem';
import { isFontId, isPaletteId, parseTheme } from '@/lib/sites/theme';

/**
 * O cadastro das peças.
 *
 * O que vem de um formulário é sempre texto. A leitura dos campos vive em
 * `loja/campos.ts`, num módulo sem `server-only`: são funções puras, e num
 * ficheiro de acções não havia como lhes chegar num teste.
 */

const ESTADOS: Estado[] = ['novo', 'seminovo', 'usado'];

function ehEstado(v: unknown): v is Estado {
  return typeof v === 'string' && (ESTADOS as string[]).includes(v);
}

function lerCampos(formData: FormData): PecaParaGravar {
  const texto = (n: string) => String(formData.get(n) ?? '').trim();
  const opcional = (n: string) => texto(n) || null;

  return {
    ref: texto('ref'),
    nome: texto('nome'),
    descricao: opcional('descricao'),
    precoCentimos: lerPreco(texto('preco')),
    precoAnteriorCentimos: lerPreco(texto('precoAnterior')),
    moeda: texto('moeda') === 'BRL' ? 'BRL' : 'EUR',
    familia: opcional('familia'),
    tipo: opcional('tipo'),
    estado: ehEstado(formData.get('estado')) ? (formData.get('estado') as Estado) : 'novo',
    notaDoEstado: opcional('notaDoEstado'),
    tamanhos: lerTamanhos(texto('tamanhos')),
    cor: opcional('cor'),
    fotos: filtrarEnderecos(texto('fotos').split(/\n+/))
      .bons.slice(0, 8)
      .map((url) => ({ url, alt: texto('nome') })),
    esgotado: formData.get('esgotado') === 'sim',
    destaque: formData.get('destaque') === 'sim',
  };
}

export async function gravarPeca(
  _previous: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const siteId = String(formData.get('siteId') ?? '');
  const pecaId = String(formData.get('pecaId') ?? '');
  if (!siteId) return { ok: false, message: 'Falta a loja.' };

  const peca = lerCampos(formData);
  if (!peca.ref) return { ok: false, message: 'A peça precisa de uma referência.' };
  if (!peca.nome) return { ok: false, message: 'A peça precisa de um nome.' };

  // Um endereço que não carrega é pior do que nenhum: ao dono a peça parece
  // cadastrada e ao cliente parece partida.
  const { recusados } = filtrarEnderecos(String(formData.get('fotos') ?? '').split(/\n+/));
  if (recusados.length > 0 && peca.fotos.length === 0) {
    return { ok: false, message: 'Nenhuma fotografia serve.', hint: recusados[0] };
  }

  try {
    if (pecaId) await actualizarPeca(supabase, pecaId, siteId, peca);
    else await criarPeca(supabase, siteId, peca);
  } catch (erro) {
    return { ok: false, message: erro instanceof Error ? erro.message : 'Não foi possível gravar.' };
  }

  revalidatePath(`/painel/site/${siteId}/pecas`);
  return { ok: true, message: `"${peca.nome}" gravada.` };
}

export async function apagarPecaDaLoja(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const pecaId = String(formData.get('pecaId') ?? '');
  const siteId = String(formData.get('siteId') ?? '');
  if (!pecaId) return;

  await apagarPeca(supabase, pecaId);
  revalidatePath(`/painel/site/${siteId}/pecas`);
}

export async function alternarEsgotada(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const pecaId = String(formData.get('pecaId') ?? '');
  const siteId = String(formData.get('siteId') ?? '');
  if (!pecaId) return;

  await marcarEsgotada(supabase, pecaId, formData.get('esgotada') !== 'sim');
  revalidatePath(`/painel/site/${siteId}/pecas`);
}

/**
 * A paleta e a letra da loja, sem passar por uma geração.
 *
 * Existe por um caso real: gerou-se com o modelo "Loja · Neon" e o site ficou
 * com a paleta pálida que já tinha, porque na altura escolher um modelo só
 * mudava o HTML e não o tema. A geração já o corrige daqui para a frente, mas
 * quem tem um site feito não tem de o pagar outra vez só para mudar a cor.
 */
export async function aparenciaDaLoja(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/entrar');

  const siteId = String(formData.get('siteId') ?? '');
  if (!siteId) return;

  const { data: site } = await supabase
    .from('generated_sites')
    .select('theme')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return;

  const actual = parseTheme(site.theme);
  const palette = formData.get('palette');
  const font = formData.get('font');

  await supabase
    .from('generated_sites')
    .update({
      theme: {
        palette: isPaletteId(palette) ? palette : actual.palette,
        font: isFontId(font) ? font : actual.font,
        imagem: actual.imagem,
      },
    })
    .eq('id', siteId);

  revalidatePath(`/painel/site/${siteId}/pecas`);
  revalidatePath(`/painel/site/${siteId}/previa`);
}
