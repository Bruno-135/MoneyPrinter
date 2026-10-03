import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { podeEntrar, TUDO, type ChaveDeAcesso } from './permissoes';

/**
 * Quem está a ver o painel, e o que pode.
 *
 * Uma ida à base por página, através da função `quem_sou()`, que já devolve
 * as três coisas de uma vez: quem é, de quem é o espaço, e a que áreas chega.
 *
 * O DONO NÃO É UM CASO ESPECIAL escrito aqui. A base devolve-lhe `*` e a
 * verificação é a mesma para toda a gente — sem isso, cada página passava a
 * ter duas linhas («é o dono? então pode») e bastava esquecer uma delas numa
 * página para o dono ficar de fora do seu próprio painel.
 */

export interface QuemSou {
  userId: string;
  /** De quem é o espaço. Igual ao `userId` quando se é dono. */
  donoId: string;
  ehDono: boolean;
  /** O nome do membro. Vazio para o dono, que não tem linha na tabela. */
  nome: string;
  permissoes: string[];
}

/**
 * Lê quem está a ver. `null` quando não há sessão nenhuma.
 *
 * Dentro de `cache()` porque isto é chamado DUAS vezes por navegação — uma
 * pela moldura, para desenhar o menu, e outra pela página, para guardar a
 * porta. Sem isto eram duas idas à base por ecrã, a perguntar a mesma coisa e
 * a receber a mesma resposta.
 */
export const lerQuemSou = cache(async function lerQuemSou(): Promise<QuemSou | null> {
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await db.rpc('quem_sou');
  if (error || !data || data.length === 0) {
    // A base não respondeu. Trata-se como "sem acesso" e não como "acesso
    // total": um erro a meio nunca pode abrir portas que estavam fechadas.
    console.error('não foi possível saber quem está a ver o painel', error?.message);
    return null;
  }

  const linha = data[0]!;
  return {
    userId: linha.user_id,
    donoId: linha.dono_id,
    ehDono: linha.eh_dono,
    nome: linha.nome,
    permissoes: linha.permissoes ?? [],
  };
});

/**
 * A guarda de cada página do painel.
 *
 * Sem sessão vai para o ecrã de entrada; com sessão mas sem a chave, vai para
 * o painel de hoje — que toda a gente com sessão pode ver. Não se devolve um
 * ecrã de «não tens acesso» porque não serve para nada: quem não tem acesso
 * também não vê o link no menu, e quem lá chegou escreveu o endereço à mão.
 */
export async function exigirAcesso(chave: ChaveDeAcesso): Promise<QuemSou> {
  const quem = await lerQuemSou();
  if (!quem) redirect('/entrar');
  if (!podeEntrar(quem.permissoes, chave)) redirect('/painel');
  return quem;
}

/**
 * Entra quem tiver QUALQUER uma das áreas.
 *
 * Para as acções que servem mais do que um ecrã: mudar a etapa de um lead
 * faz-se na lista, na ficha e na fila, e quem trabalha só na fila não pode
 * ficar impedido de o fazer por não ter a lista toda.
 */
export async function exigirAlgum(chaves: readonly ChaveDeAcesso[]): Promise<QuemSou> {
  const quem = await lerQuemSou();
  if (!quem) redirect('/entrar');
  if (!chaves.some((c) => podeEntrar(quem.permissoes, c))) redirect('/painel');
  return quem;
}

/** Só o dono. Para a própria página da equipa. */
export async function exigirSerDono(): Promise<QuemSou> {
  const quem = await lerQuemSou();
  if (!quem) redirect('/entrar');
  if (!quem.ehDono) redirect('/painel');
  return quem;
}

/** Com sessão, seja quem for. Para o painel de hoje. */
export async function exigirSessao(): Promise<QuemSou> {
  const quem = await lerQuemSou();
  if (!quem) redirect('/entrar');
  return quem;
}

export { podeEntrar, TUDO };
