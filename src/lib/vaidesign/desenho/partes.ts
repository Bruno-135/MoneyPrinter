/**
 * Os três ecrãs do formulário, todos na página ao mesmo tempo.
 *
 * O desenho traz o formulário em três estados — vazio, com erro e enviado — e
 * a maneira óbvia de os servir seria gerar três HTMLs e trocar o que está no
 * ecrã conforme o servidor responde. Só que trocar o HTML **apaga o que a
 * pessoa escreveu**: os campos são nós do DOM, e um HTML novo são nós novos,
 * vazios. Alguém que escreveu seis linhas e se enganou num dígito do telefone
 * perdia as seis linhas. Isso é imperdoável num formulário que é a porta de
 * entrada do negócio.
 *
 * Então faz-se ao contrário: as quatro partes condicionais vão TODAS para a
 * página, e quem escolhe o que se vê é uma classe no envelope. Mudar de estado
 * passa a ser mudar uma classe — o DOM não é tocado e o que está escrito
 * continua escrito.
 *
 * As partes ficam envolvidas num `<div>` com `display:contents`, que não
 * existe para o layout: os filhos continuam a ser filhos do que estava por
 * fora, com os mesmos espaçamentos do desenho.
 */

/** O nome de cada parte, como o desenho lhe chama. */
export const PARTES = ['form', 'ok2', 'erro', 'enviado'] as const;
export type Parte = (typeof PARTES)[number];

/** O fim do `<sc-if>` que abre em `inicio`, contando os que abrem lá dentro. */
function fimDoCondicional(html: string, inicio: number): { fimDaAbertura: number; inicioDoFecho: number } {
  const abertura = /<sc-if\b[^>]*>/i.exec(html.slice(inicio));
  if (!abertura) throw new Error('não é um <sc-if>');
  const fimDaAbertura = inicio + abertura[0].length;

  let i = fimDaAbertura;
  let profundidade = 1;

  while (i < html.length) {
    const proximoAbre = html.indexOf('<sc-if', i);
    const proximoFecha = html.indexOf('</sc-if>', i);
    if (proximoFecha === -1) throw new Error('<sc-if> sem fecho');

    if (proximoAbre !== -1 && proximoAbre < proximoFecha) {
      profundidade += 1;
      i = proximoAbre + 6;
      continue;
    }

    profundidade -= 1;
    if (profundidade === 0) return { fimDaAbertura, inicioDoFecho: proximoFecha };
    i = proximoFecha + 8;
  }

  throw new Error('<sc-if> sem fecho');
}

/**
 * Troca `<sc-if value="{{ e.X }}">` por um `<div>` com a classe da parte.
 *
 * Só as quatro partes do formulário são trocadas. Qualquer outro `sc-if` fica
 * para o motor resolver como sempre.
 */
export function abrirAsPartes(html: string): string {
  let saida = html;

  for (const parte of PARTES) {
    const marca = `value="{{ e.${parte} }}"`;
    const pos = saida.indexOf(marca);
    if (pos === -1) {
      throw new Error(`o desenho do contacto já não tem a parte "${parte}"`);
    }

    const inicio = saida.lastIndexOf('<sc-if', pos);
    const { fimDaAbertura, inicioDoFecho } = fimDoCondicional(saida, inicio);

    const dentro = saida.slice(fimDaAbertura, inicioDoFecho);
    saida =
      saida.slice(0, inicio) +
      `<div class="vd-parte vd-parte-${parte}">${dentro}</div>` +
      saida.slice(inicioDoFecho + '</sc-if>'.length);
  }

  return saida;
}
