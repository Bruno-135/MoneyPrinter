import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { limparPermissoes, type ChaveDeAcesso } from './permissoes';

type Db = SupabaseClient<Database>;

export interface Membro {
  id: string;
  userId: string;
  nome: string;
  email: string;
  permissoes: ChaveDeAcesso[];
  ativo: boolean;
  criadoEm: string;
}

function montar(linha: Database['public']['Tables']['membros_da_equipa']['Row']): Membro {
  return {
    id: linha.id,
    userId: linha.user_id,
    nome: linha.nome,
    email: linha.email,
    permissoes: limparPermissoes(linha.permissoes ?? []),
    ativo: linha.ativo,
    criadoEm: linha.created_at,
  };
}

/**
 * Quem tem acesso ao espaço do dono.
 *
 * A política da tabela faz o filtro por si: o dono vê as suas linhas, cada
 * membro vê só a sua. Não se acrescenta aqui um `.eq('dono_id', ...)` para
 * não haver duas versões da mesma regra a poderem discordar.
 */
export async function membros(db: Db): Promise<Membro[]> {
  const { data, error } = await db
    .from('membros_da_equipa')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Não foi possível ler a equipa: ${error.message}`);
  return (data ?? []).map(montar);
}

export async function juntarMembro(
  db: Db,
  valores: { donoId: string; userId: string; nome: string; email: string; permissoes: string[] },
): Promise<void> {
  const { error } = await db.from('membros_da_equipa').insert({
    dono_id: valores.donoId,
    user_id: valores.userId,
    nome: valores.nome,
    email: valores.email,
    permissoes: limparPermissoes(valores.permissoes),
  });
  if (error) throw new Error(`Não foi possível juntar a pessoa à equipa: ${error.message}`);
}

export async function mudarPermissoes(db: Db, id: string, permissoes: string[]): Promise<void> {
  const { error } = await db
    .from('membros_da_equipa')
    .update({ permissoes: limparPermissoes(permissoes) })
    .eq('id', id);
  if (error) throw new Error(`Não foi possível mudar os acessos: ${error.message}`);
}

/**
 * Suspende sem apagar.
 *
 * `ativo = false` e não uma linha apagada: o acesso fecha no instante seguinte
 * — `current_owner_id()` deixa de o encontrar — mas fica registado que a
 * pessoa esteve cá, e voltar a dar-lhe acesso é carregar num botão em vez de
 * criar a conta outra vez.
 */
export async function mudarAtivo(db: Db, id: string, ativo: boolean): Promise<void> {
  const { error } = await db.from('membros_da_equipa').update({ ativo }).eq('id', id);
  if (error) throw new Error(`Não foi possível mudar o estado: ${error.message}`);
}

/** Tira a pessoa da equipa. A conta de entrada continua a existir. */
export async function tirarMembro(db: Db, id: string): Promise<void> {
  const { error } = await db.from('membros_da_equipa').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível tirar a pessoa da equipa: ${error.message}`);
}
