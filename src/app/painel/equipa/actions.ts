'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerEnv } from '@/lib/env';
import { exigirSerDono } from '@/lib/equipa/quem-sou';
import { juntarMembro, mudarAtivo, mudarPermissoes, tirarMembro } from '@/lib/equipa/repository';
import { limparPermissoes } from '@/lib/equipa/permissoes';
import type { EstadoDoConvite } from './estado';

/**
 * Tudo aqui começa por `exigirSerDono()`.
 *
 * Não é repetição por distração: uma acção de servidor é um endereço público
 * como outro qualquer, e quem souber o nome dela pode chamá-la sem passar pelo
 * ecrã. Esconder o botão no ecrã da equipa não fecha porta nenhuma.
 */

/** As permissões vêm do formulário como uma caixa por área. */
function lerPermissoes(dados: FormData): string[] {
  return limparPermissoes(dados.getAll('acesso').map(String));
}

/**
 * Cria a conta de entrada e junta a pessoa à equipa.
 *
 * Precisa da chave de serviço do Supabase: criar um utilizador com senha é uma
 * operação de administração, e a chave que o navegador usa não chega lá. Se
 * ela faltar, isto DIZ-O. Já houve neste projecto um email que nunca saiu
 * porque uma chave não estava lá e nada o dizia; não se repete.
 */
export async function criarPessoa(
  _anterior: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  const dono = await exigirSerDono();

  const nome = String(dados.get('nome') ?? '').trim();
  const email = String(dados.get('email') ?? '')
    .trim()
    .toLowerCase();
  const senha = String(dados.get('senha') ?? '');
  const permissoes = lerPermissoes(dados);

  if (!nome) return { fase: 'erro', mensagem: 'Falta o nome da pessoa.' };
  if (!email.includes('@')) return { fase: 'erro', mensagem: 'O email não parece um email.' };
  if (senha.length < 8) {
    return { fase: 'erro', mensagem: 'A senha tem de ter pelo menos 8 caracteres.' };
  }

  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) {
    return {
      fase: 'erro',
      mensagem:
        'Falta a SUPABASE_SERVICE_ROLE_KEY nas variáveis do Vercel. Sem ela não é possível ' +
        'criar contas a partir daqui — é a chave de administração do Supabase, e o painel ' +
        'não a tem. Está em Supabase → Project Settings → API Keys → service_role.',
    };
  }

  let userId: string;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      // Sem confirmação por email: a senha foi dada em mão por quem convidou,
      // e mandar um email de confirmação para uma caixa que talvez não exista
      // deixava a conta criada mas sem poder entrar.
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error || !data.user) {
      const jaExiste = /already|registered|exists/i.test(error?.message ?? '');
      return {
        fase: 'erro',
        mensagem: jaExiste
          ? 'Já existe uma conta com esse email.'
          : `Não foi possível criar a conta: ${error?.message ?? 'motivo desconhecido'}`,
      };
    }
    userId = data.user.id;
  } catch (erro) {
    console.error('falhou a criação da conta de um membro', erro);
    return { fase: 'erro', mensagem: 'Não foi possível criar a conta. Tenta outra vez.' };
  }

  try {
    const db = await createClient();
    await juntarMembro(db, { donoId: dono.userId, userId, nome, email, permissoes });
  } catch (erro) {
    // A conta ficou criada e a linha não. Apaga-se a conta para não ficar uma
    // entrada órfã que dá para iniciar sessão e não leva a lado nenhum.
    console.error('conta criada mas não ficou na equipa; a desfazer', erro);
    try {
      await createAdminClient().auth.admin.deleteUser(userId);
    } catch (segundo) {
      console.error('e também não foi possível apagar a conta', segundo);
    }
    return {
      fase: 'erro',
      mensagem: 'A conta foi criada mas não ficou na equipa. Tenta outra vez.',
    };
  }

  revalidatePath('/painel/equipa');
  return { fase: 'feito', mensagem: `${nome} já pode entrar com ${email}.` };
}

export async function guardarAcessos(dados: FormData): Promise<void> {
  await exigirSerDono();
  const id = String(dados.get('id') ?? '');
  const db = await createClient();
  await mudarPermissoes(db, id, lerPermissoes(dados));
  revalidatePath('/painel/equipa');
}

export async function suspenderPessoa(dados: FormData): Promise<void> {
  await exigirSerDono();
  const id = String(dados.get('id') ?? '');
  const ativo = String(dados.get('ativo') ?? '') === 'sim';
  const db = await createClient();
  await mudarAtivo(db, id, ativo);
  revalidatePath('/painel/equipa');
}

export async function tirarPessoa(dados: FormData): Promise<void> {
  await exigirSerDono();
  const id = String(dados.get('id') ?? '');
  const db = await createClient();
  await tirarMembro(db, id);
  revalidatePath('/painel/equipa');
}
