import { versaoDe, type Presenca } from '@/lib/whatsapp/mensagem';
import { PORQUE, segmentoDoRamo } from '@/lib/whatsapp/segmentos';

/**
 * A primeira mensagem pelo Direct do Instagram.
 *
 * Mais curta e mais solta do que a do WhatsApp, e SEM LINK: num pedido de
 * mensagem de um desconhecido, um link é o que mais parece spam (e o que o
 * Instagram mais desconfia). O site da VaiDesign vê-se no perfil, que é o
 * primeiro sítio onde a pessoa vai antes de responder.
 *
 * Quem já recebeu o WhatsApp ouve isso logo a seguir à apresentação: duas
 * mensagens iguais por dois canais, sem nenhuma referência uma à outra,
 * pareciam um robô a disparar para todo o lado.
 *
 * Três versões, como no WhatsApp, escolhidas pelo id do lead (`versaoDe`).
 */

const APRESENTACAO = {
  PT: [
    'Olá! Chamo-me Bruno e faço sites para pequenos negócios.',
    'Olá, tudo bem? Sou o Bruno, trabalho com criação de sites.',
    'Olá! Aqui é o Bruno, da VaiDesign. Faço sites para negócios como o vosso.',
  ],
  BR: [
    'Oi, tudo bem? Me chamo Bruno e faço sites pra pequenos negócios.',
    'Oi! Sou o Bruno, trabalho com criação de sites.',
    'Oi, tudo bem? Aqui é o Bruno, da VaiDesign. Faço sites pra negócios como o de vocês.',
  ],
} as const;

const JA_WHATSAPP = {
  PT: 'Mandei-vos também uma mensagem pelo WhatsApp, mas achei que por aqui podia ser mais fácil.',
  BR: 'Te mandei uma mensagem pelo WhatsApp também, mas achei que por aqui talvez fosse mais fácil.',
} as const;

const PERGUNTA_SEM_SITE = {
  PT: [
    'Posso preparar um para verem como fica? Só pagam se gostarem.',
    'Querem que monte um para verem? Só pagam se gostarem, sem mensalidade.',
    'Posso fazer um e mostrar-vos? Só pagam se gostarem.',
  ],
  BR: [
    'Posso preparar um pra vocês verem como fica? Só pagam se gostarem.',
    'Querem que eu monte um pra vocês verem? Só pagam se gostarem, sem mensalidade.',
    'Posso fazer um e mostrar pra vocês? Só pagam se gostarem.',
  ],
} as const;

const PERGUNTA_COM_SITE = {
  PT: [
    'Posso preparar uma versão nova para compararem com o atual? Só pagam se gostarem.',
    'Querem que monte uma versão nova para verem ao lado da atual? Só pagam se gostarem.',
    'Posso fazer uma versão nova e mostrar-vos? Só pagam se gostarem.',
  ],
  BR: [
    'Posso preparar uma versão nova pra vocês compararem com o atual? Só pagam se gostarem.',
    'Querem que eu monte uma versão nova pra vocês verem do lado da atual? Só pagam se gostarem.',
    'Posso fazer uma versão nova e mostrar pra vocês? Só pagam se gostarem.',
  ],
} as const;

const ASSINATURA = 'Bruno · VaiDesign';

export function mensagemDoInstagram(args: {
  pais: string;
  presenca: Presenca;
  ramo?: string | null;
  /** O id do lead: escolhe qual das três versões ele recebe. */
  chave?: string | null;
  /** Já recebeu o WhatsApp: a mensagem diz que este é o segundo contacto. */
  jaRecebeuWhatsapp?: boolean;
}): string {
  const pais = args.pais === 'BR' ? 'BR' : 'PT';
  const v = versaoDe(args.chave);
  const segmento = segmentoDoRamo(args.ramo);
  const comSite = args.presenca === 'real';

  const situacao = comSite
    ? pais === 'BR'
      ? 'Vi o perfil e o site de vocês, e acho que ele pode trazer mais clientes.'
      : 'Vi o vosso perfil e o vosso site, e acho que ele vos pode trazer mais clientes.'
    : pais === 'BR'
      ? 'Vi o perfil de vocês e reparei que ainda não têm site próprio.'
      : 'Vi o vosso perfil e reparei que ainda não têm site próprio.';

  return [
    APRESENTACAO[pais][v],
    ...(args.jaRecebeuWhatsapp ? [JA_WHATSAPP[pais]] : []),
    `${situacao} ${PORQUE[segmento][pais][v]}`,
    (comSite ? PERGUNTA_COM_SITE : PERGUNTA_SEM_SITE)[pais][v],
    ASSINATURA,
  ].join('\n\n');
}
