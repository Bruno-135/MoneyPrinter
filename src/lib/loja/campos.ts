/**
 * O que vem escrito num formulário, lido como deve ser.
 *
 * Num módulo à parte e sem dependências: um ficheiro de acções importa o
 * cliente do Supabase, que traz `server-only` atrás, e um teste a isto não
 * conseguia sequer carregar o ficheiro.
 */

/**
 * O preço escrito à mão, em cêntimos.
 *
 * Aceita vírgula e ponto como decimal, e deita fora tudo o resto — o símbolo
 * da moeda, os espaços, o separador de milhares. Devolve null quando o campo
 * está vazio, que é diferente de zero: uma peça sem preço posto não é uma peça
 * grátis.
 */
export function lerPreco(bruto: string): number | null {
  const limpo = bruto.trim();
  if (limpo === '') return null;

  // Do último separador para a frente são os cêntimos; tudo o que vem antes é
  // parte inteira, com os pontos e vírgulas de milhares pelo meio.
  const semSimbolos = limpo.replace(/[^0-9.,]/g, '');
  if (semSimbolos === '') return null;

  const ultimo = Math.max(semSimbolos.lastIndexOf(','), semSimbolos.lastIndexOf('.'));
  // Três algarismos depois do separador é separador de MILHARES, não decimal:
  // "1.500" são mil e quinhentos, não um euro e meio.
  const decimais = ultimo === -1 ? '' : semSimbolos.slice(ultimo + 1);
  const temDecimal = ultimo !== -1 && decimais.length > 0 && decimais.length <= 2;

  const inteiro = (temDecimal ? semSimbolos.slice(0, ultimo) : semSimbolos).replace(/[.,]/g, '');
  const centimos = temDecimal ? decimais.padEnd(2, '0') : '00';

  const valor = Number(`${inteiro || '0'}${centimos}`);
  return Number.isFinite(valor) ? valor : null;
}

/** "S, M, L" ou "S M L" ou "38/40/42" — tudo dá a mesma lista. */
export function lerTamanhos(bruto: string): string[] {
  return bruto
    .split(/[,;/\n]+|\s{2,}/)
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .slice(0, 20);
}
