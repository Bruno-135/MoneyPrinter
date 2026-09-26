import type { PedidoLido } from './campos';

/**
 * O que a pessoa escreveu no formulário, passado a mensagem.
 *
 * A página de contacto tem três saídas — o formulário, o WhatsApp e o email —
 * e as três levam o mesmo: o que já está escrito. Quem escreveu seis linhas e
 * a meio decidiu que preferia email não as vai escrever outra vez; fecha a
 * página e não volta.
 *
 * Vive aqui, fora do componente, por duas razões. A primeira é que o WhatsApp
 * e o email diziam quase o mesmo em dois sítios diferentes, e duas cópias de
 * um texto são duas cópias que deixam de ser iguais. A segunda é que isto se
 * testa: dentro de um `useEffect` só se verificaria abrindo um browser e
 * clicando, e um teste desses parte-se com um sopro.
 */

/** Só o que a pessoa escreveu mesmo. Um campo vazio não gera linha nenhuma. */
export function linhasDoPedido(v: Partial<PedidoLido>): string[] {
  return [
    v.negocio ? `Olá! Sou da ${v.negocio}.` : '',
    v.pedido ?? '',
    v.ramo ? `O meu ramo é ${v.ramo}.` : '',
    v.prazo ? `Precisava para: ${v.prazo}.` : '',
  ].filter((l) => l.trim().length > 0);
}

/**
 * O texto para o WhatsApp.
 *
 * Sem o contacto: a conversa já vai do número da pessoa, e repetir-lho era
 * ruído. Um formulário vazio manda na mesma uma saudação — mais vale uma
 * conversa começada do que um botão que não faz nada.
 */
export function textoParaWhatsApp(v: Partial<PedidoLido>): string {
  const linhas = linhasDoPedido(v);
  return linhas.length > 0 ? linhas.join('\n\n') : 'Olá! Queria falar sobre um site.';
}

/**
 * O assunto e o corpo do email.
 *
 * Aqui o contacto VAI, ao contrário do WhatsApp: um email pode chegar de um
 * endereço pessoal que não é por onde a pessoa quer ser contactada, e o
 * telefone que ela escreveu no formulário é o que ela escolheu dar.
 *
 * O assunto leva o nome do negócio quando o há. «Pedido de site» sozinho, na
 * caixa de quem recebe dez por dia, não diz de quem é.
 */
export function emailDoPedido(v: Partial<PedidoLido>): { assunto: string; corpo: string } {
  const linhas = linhasDoPedido(v);
  if (v.contacto) linhas.push(`O meu contacto: ${v.contacto}.`);

  return {
    assunto: v.negocio ? `Pedido de site — ${v.negocio}` : 'Pedido de site',
    corpo: linhas.length > 0 ? linhas.join('\n\n') : 'Olá! Queria falar sobre um site.',
  };
}

/** O endereço `mailto:` completo, pronto a abrir. */
export function enderecoDeEmail(para: string, v: Partial<PedidoLido>): string {
  const { assunto, corpo } = emailDoPedido(v);
  return `mailto:${para}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/** O endereço do WhatsApp completo, pronto a abrir. */
export function enderecoDeWhatsApp(numero: string, v: Partial<PedidoLido>): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(textoParaWhatsApp(v))}`;
}
