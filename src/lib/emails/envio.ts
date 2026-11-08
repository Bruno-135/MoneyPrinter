import 'server-only';

import { getServerEnv } from '@/lib/env';
import { EMAIL_DA_AGENCIA } from '@/lib/vaidesign/agencia';
import type { EmailMontado } from './abordagem';

/**
 * Entregar UM e-mail à Resend. Só isto: não decide a quem, nem quantos, nem
 * se é permitido — quem chama é que responde por isso (ver `abordagens.ts`).
 *
 * Por HTTP e não com o pacote, como o aviso dos pedidos: são poucas linhas.
 */

const RESEND = 'https://api.resend.com/emails';

/** Quem escreve: uma pessoa, não «noreply» — é a uma pessoa que se responde. */
export const REMETENTE = `Bruno Dias · VaiDesign <${EMAIL_DA_AGENCIA}>`;

export type ResultadoDoEnvio = { ok: true; id: string | null } | { ok: false; erro: string };

/** A página para sair, que a pessoa abre, e a de um clique, que o Gmail chama. */
export function ligacoesParaSair(
  base: string,
  idDoEmail: string,
): { pagina: string; umClique: string } {
  const raiz = base.replace(/\/$/, '');
  return {
    pagina: `${raiz}/cancelar/${idDoEmail}`,
    umClique: `${raiz}/api/cancelar/${idDoEmail}`,
  };
}

export function cabecalhosParaSair(umClique: string): Record<string, string> {
  return {
    // O Gmail e o Yahoo pedem isto: dá o botão «cancelar subscrição» no topo do
    // e-mail. Sem ele, quem não quer receber mais carrega em «spam» — e é o
    // spam que estraga o domínio para todos os e-mails seguintes.
    'List-Unsubscribe': `<${umClique}>, <mailto:${EMAIL_DA_AGENCIA}?subject=cancelar>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export async function enviarEmail(args: {
  para: string;
  montado: EmailMontado;
  umClique: string;
}): Promise<ResultadoDoEnvio> {
  const chave = getServerEnv().RESEND_API_KEY;
  if (!chave) return { ok: false, erro: 'Falta a RESEND_API_KEY neste ambiente.' };

  try {
    const resposta = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: REMETENTE,
        to: [args.para],
        reply_to: EMAIL_DA_AGENCIA,
        subject: args.montado.assunto,
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
