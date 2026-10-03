'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAcesso, exigirSerDono } from '@/lib/equipa/quem-sou';
import { enviarEmail, ligacoesParaSair } from '@/lib/emails/envio';
import {
  MAXIMO_POR_ENVIO,
  aprovar,
  campanhaAtual,
  candidatosPorId,
  enviadosNasUltimas24h,
  esquecerEnvio,
  guardarTexto,
  marcarEnviado,
  registarEnvio,
} from '@/lib/emails/envios';
import { dadosDoLead, marcadoresDesconhecidos, montar, preencher } from '@/lib/emails/modelo';
import type { EstadoDeEnvio } from './estado';

/**
 * As ações do envio de e-mails.
 *
 * Três regras que valem para todas, e que o resto do ficheiro faz cumprir:
 *   1. Nada sai com um texto que o dono não aprovou. Mudar uma vírgula apaga a
 *      aprovação.
 *   2. Quem manda é um clique, com a lista exacta à frente. Não há envio
 *      agendado, nem «enviar tudo».
 *   3. À primeira falha pára-se. Um erro de domínio ou de chave repetido trinta
 *      vezes é trinta tentativas a estragar a reputação do remetente.
 */

const LIMITE_ASSUNTO = 150;
const LIMITE_CORPO = 4000;
const ESPERA_ENTRE_ENVIOS_MS = 1200;

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? '').replace(/\r\n/g, '\n');
}

export async function guardarMensagem(
  _anterior: EstadoDeEnvio,
  form: FormData,
): Promise<EstadoDeEnvio> {
  await exigirAcesso('emails');
  const assunto = texto(form, 'assunto').trim();
  const corpo = texto(form, 'corpo').trim();

  if (!assunto || !corpo)
    return { ok: false, mensagem: 'O assunto e o texto não podem estar vazios.' };
  if (assunto.length > LIMITE_ASSUNTO) {
    return { ok: false, mensagem: `O assunto passa dos ${LIMITE_ASSUNTO} caracteres.` };
  }
  if (corpo.length > LIMITE_CORPO) {
    return { ok: false, mensagem: `O texto passa dos ${LIMITE_CORPO} caracteres.` };
  }
  const desconhecidos = [...marcadoresDesconhecidos(assunto), ...marcadoresDesconhecidos(corpo)];
  if (desconhecidos.length > 0) {
    return {
      ok: false,
      mensagem: 'Há marcadores que não existem — sairiam tal e qual no e-mail.',
      detalhes: [...new Set(desconhecidos)].map((m) => `{${m}}`),
    };
  }

  const supabase = await createClient();
  await guardarTexto(supabase, { assunto, corpo });
  revalidatePath('/painel/emails');
  return { ok: true, mensagem: 'Guardado. Falta aprovar antes de poder enviar.' };
}

export async function aprovarMensagem(
  _anterior: EstadoDeEnvio,
  form: FormData,
): Promise<EstadoDeEnvio> {
  await exigirSerDono();
  const supabase = await createClient();
  const campanha = await campanhaAtual(supabase);
  if (!campanha) return { ok: false, mensagem: 'Guarda a mensagem primeiro.' };

  // Aprova-se o que estava no ecrã, e só se ainda for o que está guardado.
  const aprovada = await aprovar(
    supabase,
    campanha.id,
    texto(form, 'assunto'),
    texto(form, 'corpo'),
  );
  revalidatePath('/painel/emails');
  return aprovada
    ? { ok: true, mensagem: 'Aprovada. Já podes preparar um envio.' }
    : { ok: false, mensagem: 'O texto mudou entretanto. Lê-o outra vez e volta a aprovar.' };
}

export async function enviarTeste(): Promise<EstadoDeEnvio> {
  await exigirAcesso('emails');
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const para = auth.user?.email;
  if (!para) return { ok: false, mensagem: 'Esta conta não tem e-mail.' };

  const campanha = await campanhaAtual(supabase);
  if (!campanha) return { ok: false, mensagem: 'Guarda a mensagem primeiro.' };

  // Um negócio inventado: o teste vai para quem está a testar, nunca para um lead.
  const dados = dadosDoLead({ name: 'Padaria Exemplo', locality: 'Lisboa' });
  const assunto = preencher(campanha.assunto, dados);
  const corpo = preencher(campanha.corpo, dados);
  if (!assunto.ok || !corpo.ok)
    return { ok: false, mensagem: 'Faltam dados para preencher o texto.' };

  const ligacoes = ligacoesParaSair(randomUUID());
  const resultado = await enviarEmail({
    para,
    montado: montar(assunto.texto, corpo.texto, ligacoes.pagina),
    umClique: ligacoes.umClique,
    teste: true,
  });

  return resultado.ok
    ? {
        ok: true,
        mensagem: `Teste enviado para ${para}. Vê se chegou à caixa de entrada ou ao spam.`,
      }
    : { ok: false, mensagem: 'O teste não saiu.', detalhes: [resultado.erro] };
}

export async function enviarLote(_anterior: EstadoDeEnvio, form: FormData): Promise<EstadoDeEnvio> {
  await exigirAcesso('emails');
  const supabase = await createClient();

  const campanha = await campanhaAtual(supabase);
  if (!campanha?.aprovadaEm) {
    return { ok: false, mensagem: 'A mensagem não está aprovada. Nada foi enviado.' };
  }

  const ids = [...new Set(form.getAll('id').map(String))].slice(0, MAXIMO_POR_ENVIO);
  if (ids.length === 0) return { ok: false, mensagem: 'Não há ninguém selecionado.' };

  const jaEnviados = await enviadosNasUltimas24h(supabase);
  const sobra = campanha.limiteDiario - jaEnviados;
  if (sobra <= 0) {
    return {
      ok: false,
      mensagem: `O limite das últimas 24 horas (${campanha.limiteDiario}) já foi atingido. Nada foi enviado.`,
    };
  }

  // Relê-se cada lead: entre ver a lista e carregar no botão, alguém pode ter
  // sido contactado por outra via, ou pedido para sair.
  const vivos = await candidatosPorId(supabase, ids);
  const lista = ids.flatMap((id) => vivos.filter((c) => c.id === id)).slice(0, sobra);
  const deFora = ids.length - lista.length;

  let enviados = 0;
  const detalhes: string[] = [];

  for (const lead of lista) {
    const dados = dadosDoLead({ name: lead.name, locality: lead.locality });
    const assunto = preencher(campanha.assunto, dados);
    const corpo = preencher(campanha.corpo, dados);
    if (!assunto.ok || !corpo.ok) {
      const faltam = [...(assunto.ok ? [] : assunto.faltam), ...(corpo.ok ? [] : corpo.faltam)];
      detalhes.push(`${lead.name}: falta ${[...new Set(faltam)].join(', ')} — não enviado`);
      continue;
    }

    const id = randomUUID();
    const ligacoes = ligacoesParaSair(id);
    const montado = montar(assunto.texto, corpo.texto, ligacoes.pagina);

    // Regista-se ANTES de enviar: se o processo morrer a meio, o lead fica
    // marcado e não leva o mesmo e-mail outra vez. Se o envio falhar, apaga-se.
    await registarEnvio(supabase, {
      id,
      businessId: lead.id,
      para: lead.email,
      assunto: montado.assunto,
      corpo: montado.texto,
      campanhaId: campanha.id,
    });

    const resultado = await enviarEmail({ para: lead.email, montado, umClique: ligacoes.umClique });
    if (!resultado.ok) {
      await esquecerEnvio(supabase, id);
      detalhes.push(`${lead.name} (${lead.email}): ${resultado.erro}`);
      revalidatePath('/painel/emails');
      return {
        ok: false,
        mensagem: `Parou à primeira falha. Enviados: ${enviados}.`,
        detalhes,
      };
    }

    await marcarEnviado(supabase, id, resultado.id);
    enviados++;
    if (enviados < lista.length) {
      await new Promise((r) => setTimeout(r, ESPERA_ENTRE_ENVIOS_MS));
    }
  }

  if (deFora > 0) detalhes.push(`${deFora} já não estavam disponíveis e ficaram de fora.`);
  revalidatePath('/painel/emails');
  revalidatePath('/painel/comercios');
  return {
    ok: enviados > 0,
    mensagem: enviados === 1 ? 'Enviado 1 e-mail.' : `Enviados ${enviados} e-mails.`,
    detalhes: detalhes.length > 0 ? detalhes : undefined,
  };
}
