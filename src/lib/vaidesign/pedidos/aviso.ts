import 'server-only';

import { getServerEnv } from '@/lib/env';
import { publicEnv } from '@/lib/env';
import { EMAIL_DA_AGENCIA } from '../agencia';
import { ehEmail, type PedidoLido } from './campos';

/**
 * O email a avisar que chegou um pedido.
 *
 * O aviso é o toque no telemóvel; o registo é a linha na base de dados. Por
 * isso esta função NUNCA rebenta o envio do formulário: se a chave não estiver
 * posta, ou se a Resend estiver em baixo, o pedido já foi gravado e aparece no
 * painel na mesma. Falhar o aviso é chato; perder o pedido era grave.
 *
 * Usa-se a API por HTTP e não um pacote: são doze linhas de `fetch` contra uma
 * dependência a mais para instalar, actualizar e auditar.
 */

const RESEND = 'https://api.resend.com/emails';

/** Onde é que isto foi parar, para o aviso dizer o que aconteceu. */
export type EstadoDoAviso = 'enviado' | 'sem-chave' | 'falhou';

export interface ResultadoDoAviso {
  estado: EstadoDoAviso;
  /** O que a Resend respondeu: o id quando aceitou, o erro quando recusou. */
  detalhe: string | null;
}

function escapar(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * O corpo do email.
 *
 * Escrito para ser lido num telemóvel, de pé, com uma mão. O contacto vem
 * primeiro e como link: o que se quer às nove da manhã é carregar no número e
 * ligar, não ler um relatório.
 */
export function corpoDoAviso(p: PedidoLido, ligacaoAoPainel: string): string {
  const email = ehEmail(p.contacto);
  const href = email
    ? `mailto:${encodeURIComponent(p.contacto)}`
    : `tel:${p.contacto.replace(/[^\d+]/g, '')}`;

  const linhas = [
    `<p style="margin:0 0 4px;font:600 13px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#5A5249">Pedido novo pelo site</p>`,
    `<h1 style="margin:0 0 16px;font:700 28px system-ui;color:#141210">${escapar(p.negocio)}</h1>`,
    `<p style="margin:0 0 20px;font:600 20px system-ui"><a href="${href}" style="color:#BA4100">${escapar(p.contacto)}</a></p>`,
    `<p style="margin:0 0 20px;font:400 16px/1.6 system-ui;color:#141210;white-space:pre-wrap">${escapar(p.pedido)}</p>`,
  ];

  if (p.ramo) {
    linhas.push(
      `<p style="margin:0 0 4px;font:400 15px system-ui;color:#5A5249">Ramo — <strong style="color:#141210">${escapar(p.ramo)}</strong></p>`,
    );
  }
  if (p.prazo) {
    linhas.push(
      `<p style="margin:0 0 4px;font:400 15px system-ui;color:#5A5249">Para quando — <strong style="color:#141210">${escapar(p.prazo)}</strong></p>`,
    );
  }

  linhas.push(
    `<p style="margin:24px 0 0"><a href="${ligacaoAoPainel}" style="display:inline-block;padding:12px 20px;background:#141210;color:#F6EFE4;border-radius:999px;font:600 14px system-ui;text-decoration:none">Ver no painel</a></p>`,
  );

  return `<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#F6EFE4">${linhas.join('')}</div>`;
}

/**
 * Manda o aviso e DIZ o que aconteceu.
 *
 * Antes não dizia. O primeiro pedido a sério entrou pelo site, o email não
 * apareceu, e fui ao log do servidor à procura da razão: não estava lá nada.
 * O caminho bom era calado, o caminho «não há chave» era calado, e quem
 * chamava esta função deitava o resultado fora. Ficámos os dois — eu e quem
 * espera pelo email — sem maneira de saber se o aviso tinha sequer sido
 * tentado.
 *
 * Agora todos os caminhos escrevem no log, e quem chama guarda o resultado na
 * linha do pedido. Diagnosticar isto não pode depender de eu ter acesso a um
 * log de produção que o dono do site não tem.
 */
export async function avisarDoPedido(p: PedidoLido): Promise<ResultadoDoAviso> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    console.error('aviso do pedido: não há RESEND_API_KEY neste ambiente');
    return { estado: 'sem-chave', detalhe: 'RESEND_API_KEY não está definida' };
  }

  const para = env.EMAIL_DOS_AVISOS ?? EMAIL_DA_AGENCIA;
  const painel = `${publicEnv.NEXT_PUBLIC_SITE_URL}/painel/pedidos`;

  try {
    const resposta = await fetch(RESEND, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `VaiDesign <${EMAIL_DA_AGENCIA}>`,
        to: [para],
        // O `reply_to` é o que faz a diferença na prática: carregas em
        // responder e a resposta vai para o cliente, não para ti.
        reply_to: ehEmail(p.contacto) ? p.contacto : undefined,
        subject: `Pedido novo — ${p.negocio}`,
        html: corpoDoAviso(p, painel),
      }),
    });

    const corpo = await resposta.text();

    if (!resposta.ok) {
      console.error('aviso do pedido: a Resend recusou', resposta.status, corpo);
      return { estado: 'falhou', detalhe: `${resposta.status} ${corpo}`.trim() };
    }

    // O id da mensagem é o que se leva ao painel da Resend para ver se ela
    // chegou mesmo a entrar na caixa, ou se ficou pelo caminho.
    let id: string | null = null;
    try {
      id = (JSON.parse(corpo) as { id?: string }).id ?? null;
    } catch {
      id = null;
    }

    console.log('aviso do pedido: a Resend aceitou', { para, id });
    return { estado: 'enviado', detalhe: id };
  } catch (erro) {
    console.error('aviso do pedido: não foi possível falar com a Resend', erro);
    return { estado: 'falhou', detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}
