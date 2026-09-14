/**
 * Ler e escrever valores de dinheiro.
 *
 * Guarda-se em cêntimos, inteiros. Dinheiro em vírgula flutuante acaba sempre
 * com um cêntimo a faltar numa soma, e uma conta de faturação que não fecha é
 * das poucas coisas que fazem perder a confiança num sistema de uma vez.
 *
 * A leitura é deliberadamente tolerante. Quem regista uma venda escreve "30",
 * "30,00", "30 €", "R$ 1.500,00" ou "1500" — está a fechar negócio, não a
 * preencher um formulário fiscal. Recusar o que se percebe seria fazer o
 * trabalho do computador à pessoa.
 */

/** As moedas dos dois mercados. Não há mais nenhuma até haver. */
export const MOEDAS = { PT: 'EUR', BR: 'BRL' } as const;

export function moedaDoPais(countryCode: string): string {
  return countryCode.toUpperCase() === 'BR' ? MOEDAS.BR : MOEDAS.PT;
}

/**
 * Texto escrito por uma pessoa → cêntimos.
 *
 * Devolve null quando não há número nenhum lá dentro, o que é diferente de
 * zero: "não disse quanto" e "foi de graça" não são a mesma coisa, e uma venda
 * sem valor registado continua a ser uma venda.
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,]/g, '').trim();
  if (limpo === '') return null;

  // Qual dos dois separadores é o decimal? O ÚLTIMO a aparecer, quando deixa
  // uma ou duas casas atrás de si. "1.500,00" tem ponto de milhares e vírgula
  // decimal; "1,500.00" é o contrário; "1.500" são mil e quinhentos e não um
  // e meio — três casas atrás do separador nunca são cêntimos.
  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  const posicao = Math.max(ultimaVirgula, ultimoPonto);
  const casas = posicao === -1 ? 0 : limpo.length - posicao - 1;

  const decimal = posicao !== -1 && casas >= 1 && casas <= 2;

  const inteiro = decimal ? limpo.slice(0, posicao) : limpo;
  const fracao = decimal ? limpo.slice(posicao + 1) : '';

  const euros = Number(inteiro.replace(/[.,]/g, ''));
  if (!Number.isFinite(euros)) return null;

  // "30,5" é trinta euros e cinquenta cêntimos, não cinco.
  const centimos = fracao === '' ? 0 : Number(fracao.padEnd(2, '0'));
  if (!Number.isFinite(centimos)) return null;

  return euros * 100 + centimos;
}

/** Cêntimos → texto para ler, com a vírgula do português. */
export function escreverValor(centimos: number, moeda: string): string {
  const simbolo = moeda === 'BRL' ? 'R$' : '€';
  const valor = (centimos / 100).toFixed(2).replace('.', ',');
  return moeda === 'BRL' ? `${simbolo} ${valor}` : `${valor} ${simbolo}`;
}
