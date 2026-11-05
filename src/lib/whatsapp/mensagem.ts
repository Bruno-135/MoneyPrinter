import { O_QUE_LEVA, PORQUE, segmentoDoRamo } from './segmentos';

/**
 * A primeira mensagem de WhatsApp.
 *
 * Escrita como se escreve a um desconhecido, e por isso SEM o nome do negócio:
 * «Olá, Padaria Central Lda!» denuncia logo uma lista. O que varia é o que
 * uma pessoa variaria — o «bom dia / boa tarde» pela hora de lá, e o jeito de
 * falar de cada país.
 *
 * A frase «ainda não têm site» só se diz a quem de facto não tem. Quem só tem
 * Instagram ou Facebook ouve uma variante; quem já tem site próprio não recebe
 * esta mensagem (devolve null) — dizer-lhe que não tem site era a maneira mais
 * rápida de perder a conversa.
 */

export type Presenca = 'none' | 'social_only' | 'real';

const FUSO: Record<string, string> = {
  PT: 'Europe/Lisbon',
  BR: 'America/Sao_Paulo',
};

/** «bom dia», «boa tarde» ou «boa noite», pela hora no país do lead. */
export function saudacao(pais: string, agora: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: FUSO[pais] ?? FUSO.PT,
    }).format(agora),
  );
  if (hora >= 5 && hora < 12) return 'bom dia';
  if (hora >= 12 && hora < 19) return 'boa tarde';
  return 'boa noite';
}

/** O site da agência, na versão do país do lead. */
const SITE: Record<string, string> = {
  PT: 'https://vaidesign.net',
  BR: 'https://vaidesign.net/br',
};

/**
 * Fecha como uma carta, com o nome todo. Antes dela, uma pergunta a que basta
 * responder «sim»: sem pergunta no fim, a mensagem não pede resposta nenhuma.
 */
const ASSINATURA = 'Atenciosamente,\nBruno Dias';

/**
 * Três versões de cada mensagem. A mesma mensagem, letra por letra, enviada
 * trinta vezes por dia é um dos sinais que o WhatsApp usa para bloquear um
 * número; três versões por segmento já não são a mesma mensagem. Mudam a
 * apresentação, o porquê e a pergunta — sempre os três da mesma versão, para
 * a mensagem se ler como uma só.
 */
const APRESENTACAO = {
  PT: [
    (s: string) => `Olá, ${s}! Chamo-me Bruno e trabalho com criação de sites.`,
    (s: string) => `Olá, ${s}! O meu nome é Bruno e faço sites para pequenos negócios.`,
    (s: string) => `Olá, ${s}! Aqui é o Bruno, trabalho com criação de sites.`,
  ],
  BR: [
    (s: string) => `Oi, ${s}! Tudo bem? Me chamo Bruno e trabalho com criação de sites.`,
    (s: string) => `Oi, ${s}! Tudo bem? Meu nome é Bruno e faço sites pra pequenos negócios.`,
    (s: string) => `Oi, ${s}! Aqui é o Bruno, tudo bem? Trabalho com criação de sites.`,
  ],
} as const;

const PERGUNTA = {
  PT: [
    'Querem que prepare um para verem como fica?',
    'Posso preparar uma versão para verem como fica?',
    'Querem ver como ficaria o vosso?',
  ],
  BR: [
    'Querem que eu prepare um pra vocês verem como fica?',
    'Posso preparar uma versão pra vocês verem como fica?',
    'Querem ver como ficaria o de vocês?',
  ],
} as const;

/**
 * A versão de um lead: sempre a mesma para o mesmo lead (a que se lê no painel
 * é a que vai), e espalhada pelas três ao longo da lista. Sem chave, a primeira.
 */
export function versaoDe(chave: string | null | undefined): 0 | 1 | 2 {
  if (!chave) return 0;
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return (h % 3) as 0 | 1 | 2;
}

/**
 * Sem preço, de propósito. O que convence quem não nos conhece é «só paga se
 * gostar»; o valor diz-se quando responderem, já interessados. Com o número à
 * cabeça, a pessoa decidia pelo número antes de perceber o que recebia.
 *
 * Vários parágrafos, como se escreve no WhatsApp: o `encodeURIComponent` de
 * `whatsappUrl` leva as quebras de linha intactas até à caixa de texto.
 */
export function mensagemDeAbertura(args: {
  pais: string;
  presenca: Presenca;
  /** Slug do ramo: escolhe o que o site leva e o que o botão faz. */
  ramo?: string | null;
  /** O id do lead: escolhe qual das três versões ele recebe. */
  chave?: string | null;
  agora?: Date;
}): string | null {
  if (args.presenca === 'real') return null;
  const s = saudacao(args.pais, args.agora);
  const soRedes = args.presenca === 'social_only';
  const segmento = segmentoDoRamo(args.ramo);
  const leva = O_QUE_LEVA[segmento];
  const v = versaoDe(args.chave);

  if (args.pais === 'BR') {
    const situacao = soRedes
      ? 'vi que vocês estão só nas redes sociais e ainda não têm um site próprio'
      : 'vi que vocês ainda não têm um site próprio';
    return [
      APRESENTACAO.BR[v](s),
      `Achei vocês no Google Maps e ${situacao}. ${PORQUE[segmento].BR[v]}`,
      `Queria fazer uma proposta: eu monto o site primeiro, ${leva.BR}. Vocês veem pronto e só pagam se gostarem. Sem mensalidade e sem compromisso.`,
      `Esse é o meu site: ${SITE.BR}`,
      'Desculpa se esse não for o número de quem cuida dessa parte. Se preferir, me passa o contato da pessoa certa ou um e-mail que eu falo por lá.',
      PERGUNTA.BR[v],
      ASSINATURA,
    ].join('\n\n');
  }

  const situacao = soRedes
    ? 'reparei que estão só nas redes sociais e ainda não têm site próprio'
    : 'reparei que ainda não têm site próprio';
  return [
    APRESENTACAO.PT[v](s),
    `Encontrei o vosso negócio no Google Maps e ${situacao}. ${PORQUE[segmento].PT[v]}`,
    `Queria fazer-vos uma proposta: eu monto o site primeiro, ${leva.PT}. Veem-no pronto e só pagam se gostarem. Sem mensalidade e sem compromisso.`,
    `Este é o meu site: ${SITE.PT}`,
    'Peço desculpa se este não for o número de quem trata desta parte. Se preferir, passe-me o contacto da pessoa certa ou um e-mail e falo por lá.',
    PERGUNTA.PT[v],
    ASSINATURA,
  ].join('\n\n');
}
