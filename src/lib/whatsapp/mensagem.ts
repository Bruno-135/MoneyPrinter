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

export function mensagemDeAbertura(args: {
  pais: string;
  presenca: Presenca;
  agora?: Date;
}): string | null {
  if (args.presenca === 'real') return null;
  const s = saudacao(args.pais, args.agora);
  const soRedes = args.presenca === 'social_only';

  if (args.pais === 'BR') {
    const situacao = soRedes
      ? 'vi que vocês estão só nas redes sociais e ainda não têm site próprio'
      : 'vi que ainda não têm site';
    return (
      `Oi, ${s}! Tudo bem? Aqui é o Bruno. Achei vocês no Google Maps e ${situacao}. ` +
      'Eu trabalho justamente com isso, sites e redes sociais, e fiz um exemplo de como o de vocês poderia ficar. ' +
      'Quer que eu te mande pra dar uma olhada? Sem compromisso nenhum.'
    );
  }

  const situacao = soRedes
    ? 'reparei que estão só nas redes sociais e ainda não têm site próprio'
    : 'reparei que ainda não têm site';
  return (
    `Olá, ${s}! Aqui é o Bruno. Encontrei o vosso negócio no Google Maps e ${situacao}. ` +
    'Trabalho precisamente com isso, sites e redes sociais, e fiz um exemplo de como o vosso podia ficar. ' +
    'Quer que lhe envie para ver? Sem compromisso nenhum.'
  );
}
