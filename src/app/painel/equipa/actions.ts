'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirSerDono } from '@/lib/equipa/quem-sou';
import { mudarAtivo, mudarPermissoes, tirarMembro } from '@/lib/equipa/repository';
import { limparPermissoes } from '@/lib/equipa/permissoes';
import type { EstadoDoConvite } from './estado';

/**
 * Tudo aqui começa por `exigirSerDono()`.
 *
 * Não é repetição por distração: uma acção de servidor é um endereço público
 * como outro qualquer, e quem souber o nome dela pode chamá-la sem passar pelo
 * ecrã. Esconder o botão no ecrã da equipa não fecha porta nenhuma. E a base
 * volta a verificar o mesmo por sua conta — duas fechaduras na mesma porta,
 * porque esta abre contas de acesso.
 */

/** As permissões vêm do formulário como uma caixa por área. */
function lerPermissoes(dados: FormData): string[] {
  return limparPermissoes(dados.getAll('acesso').map(String));
}

/**
 * As mensagens que a base devolve já estão escritas para se lerem.
 *
 * Um `raise exception` do Postgres chega cá dentro de uma cápsula com o código
 * do erro à frente. Mostrar isso a quem está a preencher um formulário é
 * mostrar-lhe as entranhas; mas deitar fora e escrever "algo correu mal" é
 * esconder a única coisa útil. Passa-se a frase e deita-se fora o resto.
 */
function frase(erro: string): string {
  const limpa = erro.replace(/^.*?(?:ERROR|erro):\s*/i, '').trim();
  return limpa.charAt(0).toUpperCase() + limpa.slice(1);
}

/**
 * Cria a conta de entrada e junta a pessoa à equipa.
 *
 * Passa por `criar_acesso` na base e NÃO pela API de administração do
 * Supabase. A diferença é uma chave: a API de administração precisa da
 * SUPABASE_SERVICE_ROLE_KEY, que é a chave-mestra do projecto e teria de ficar
 * a viver dentro da aplicação para se usar uma vez por mês. A função da base
 * só sabe fazer isto, só o dono lhe chega, e não há chave nenhuma para
 * guardar em lado nenhum.
 */
export async function criarPessoa(
  _anterior: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  await exigirSerDono();

  const nome = String(dados.get('nome') ?? '').trim();
  const email = String(dados.get('email') ?? '')
    .trim()
    .toLowerCase();
  const senha = String(dados.get('senha') ?? '');

  // Os mesmos limites que a base impõe, verificados aqui para a pessoa saber
  // logo o que falta em vez de esperar por uma ida ao servidor.
  if (!nome) return { fase: 'erro', mensagem: 'Falta o nome da pessoa.' };
  if (!email.includes('@')) return { fase: 'erro', mensagem: 'O email não parece um email.' };
  if (senha.length < 8) {
    return { fase: 'erro', mensagem: 'A senha tem de ter pelo menos 8 caracteres.' };
  }

  const db = await createClient();
  const { error } = await db.rpc('criar_acesso', {
    p_nome: nome,
    p_email: email,
    p_senha: senha,
    p_permissoes: lerPermissoes(dados),
    p_papel: String(dados.get('papel') ?? ''),
  });

  if (error) {
    console.error('não foi possível criar o acesso', error.message);
    return { fase: 'erro', mensagem: frase(error.message) };
  }

  revalidatePath('/painel/equipa');
  return { fase: 'feito', mensagem: `${nome} já pode entrar com ${email}.` };
}

/** Troca a senha de alguém da equipa, para quando ela se perde. */
export async function trocarSenha(
  _anterior: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  await exigirSerDono();

  const id = String(dados.get('id') ?? '');
  const senha = String(dados.get('senha') ?? '');
  if (senha.length < 8) {
    return { fase: 'erro', mensagem: 'A senha tem de ter pelo menos 8 caracteres.' };
  }

  const db = await createClient();
  const { error } = await db.rpc('mudar_senha_do_membro', { p_membro: id, p_senha: senha });
  if (error) {
    console.error('não foi possível trocar a senha', error.message);
    return { fase: 'erro', mensagem: frase(error.message) };
  }

  revalidatePath('/painel/equipa');
  return { fase: 'feito', mensagem: 'Senha trocada. Passa-lhe a nova.' };
}

/**
 * Guarda os acessos, e DIZ que guardou.
 *
 * Devolvia `void`. Gravava sempre — os registos do servidor mostravam os
 * pedidos a chegar e a responder 204 — mas o ecrã ficava exactamente igual:
 * a caixa aberta, as mesmas caixas marcadas, nem uma palavra. Quem carregava
 * carregava outra vez, e outra, a pensar que o botão estava partido.
 *
 * Gravar e não dar sinal é, para quem está do outro lado, o mesmo que não
 * gravar. Por isso devolve uma frase.
 */
export async function guardarAcessos(
  _anterior: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  await exigirSerDono();

  const id = String(dados.get('id') ?? '');
  const areas = lerPermissoes(dados);
  const db = await createClient();

  try {
    await mudarPermissoes(db, id, areas, String(dados.get('papel') ?? ''));
  } catch (erro) {
    console.error('não foi possível guardar os acessos', erro);
    return { fase: 'erro', mensagem: frase(String(erro)) };
  }

  revalidatePath('/painel/equipa');
  return {
    fase: 'feito',
    mensagem:
      areas.length === 0
        ? 'Guardado — ficou sem acesso a nenhuma área.'
        : `Guardado — ${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}.`,
  };
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
