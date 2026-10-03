import 'server-only';

import { getServerEnv, publicEnv } from '@/lib/env';
import { ENVIO_DE_EMAIL, ENVIO_DE_NOME, ENVIO_RESPOSTAS_PARA } from '@/lib/vaidesign/agencia';
import type { Montado } from './modelo';

/**
 * Entregar UM e-mail ao Resend. Só isto: não decide a quem, nem quantos, nem
 * se é permitido — quem chama é que responde por isso (ver `envio-actions.ts`).
 *
 * Por HTTP e não com o pacote, como o aviso dos pedidos: são poucas linhas.
 */

const RESEND = 'https://api.resend.com/emails';

export type ResultadoDoEnvio = { ok: true; id: string | null } | { ok: false; erro: string };

/** A ligação que a pessoa abre, e a que o Gmail/Outlook chamam sozinhos. */
export function ligacoesParaSair(idDoEmail: string): { pagina: string; umClique: string } {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    pagina: `${base}/cancelar/${idDoEmail}`,
    umClique: `${base}/api/cancelar/${idDoEmail}`,
  };
}

export function cabecalhosParaSair(umClique: string): Record<string, string> {
  return {
    // O Gmail e o Yahoo exigem isto a quem manda em volume: dá o botão
    // «cancelar subscrição» no topo do e-mail. Sem ele, quem não quer receber
    // mais carrega em «spam» — e é o spam que estraga o domínio.
    'List-Unsubscribe': `<${umClique}>, <mailto:${ENVIO_RESPOSTAS_PARA}?subject=cancelar>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export async function enviarEmail(args: {
  para: string;
  montado: Montado;
  umClique: string;
  /** Só nos testes: marca o assunto para ninguém os confundir com envios a sério. */
  teste?: boolean;
}): Promise<ResultadoDoEnvio> {
  const chave = getServerEnv().RESEND_API_KEY;
  if (!chave) return { ok: false, erro: 'Falta a RESEND_API_KEY neste ambiente.' };

  try {
    const resposta = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${ENVIO_DE_NOME} <${ENVIO_DE_EMAIL}>`,
        to: [args.para],
        reply_to: ENVIO_RESPOSTAS_PARA,
        subject: args.teste ? `[TESTE] ${args.montado.assunto}` : args.montado.assunto,
        text: args.montado.texto,
        html: args.montado.html,
        headers: cabecalhosParaSair(args.umClique),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const corpo = await resposta.text();

    if (!resposta.ok) {
      let detalhe = corpo;
      try {
        detalhe = (JSON.parse(corpo) as { message?: string }).message ?? corpo;
      } catch {
        // fica o texto cru
      }
      return { ok: false, erro: `${resposta.status}: ${detalhe}`.trim() };
    }

    let id: string | null = null;
    try {
      id = (JSON.parse(corpo) as { id?: string }).id ?? null;
    } catch {
      id = null;
    }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
