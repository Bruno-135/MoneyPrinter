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
    fotos: texto('fotos')
      .split(/\n+/)
      .map((url) => url.trim())
      .filter((url) => /^https?:\/\//i.test(url))
      .slice(0, 8)
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
