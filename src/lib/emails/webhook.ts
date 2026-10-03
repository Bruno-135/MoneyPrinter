import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Confirmar que um aviso vem mesmo do Resend.
 *
 * O Resend assina com o esquema Svix: `HMAC-SHA256(id.timestamp.corpo)` com a
 * chave `whsec_…` (em base64) e manda o resultado em `svix-signature`, como
 * `v1,<assinatura>` (pode vir mais de uma, separadas por espaço).
 *
 * Sem isto, qualquer pessoa que descubra o endereço da rota podia marcar
 * e-mails como devolvidos e pôr gente na lista de não contactar.
 */

const TOLERANCIA_S = 5 * 60;

export function assinar(segredo: string, id: string, timestamp: string, corpo: string): string {
  const chave = Buffer.from(segredo.replace(/^whsec_/, ''), 'base64');
  return createHmac('sha256', chave).update(`${id}.${timestamp}.${corpo}`).digest('base64');
}

export function assinaturaValida(args: {
  segredo: string;
  id: string | null;
  timestamp: string | null;
  assinaturas: string | null;
  corpo: string;
  agora?: number;
}): boolean {
  const { segredo, id, timestamp, assinaturas, corpo } = args;
  if (!id || !timestamp || !assinaturas) return false;

  const t = Number(timestamp);
  const agora = args.agora ?? Math.floor(Date.now() / 1000);
  // Fora da janela é um aviso repetido por quem o apanhou pelo caminho.
  if (!Number.isFinite(t) || Math.abs(agora - t) > TOLERANCIA_S) return false;

  const esperada = Buffer.from(assinar(segredo, id, timestamp, corpo));
  return assinaturas.split(' ').some((par) => {
    const [versao, valor] = par.split(',');
    if (versao !== 'v1' || !valor) return false;
    const recebida = Buffer.from(valor);
    return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
  });
}
