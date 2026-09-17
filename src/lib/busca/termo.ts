/**
 * O termo escrito, preparado para bater com `businesses.procura_texto`.
 *
 * Tem de fazer EXACTAMENTE o que a função `normalizar_procura` faz em SQL
 * (migração 0030). Se as duas divergirem, quem escreve "Ançã" deixa de
 * encontrar "Ançã" — e o sintoma é uma procura que não devolve nada sem dar
 * erro nenhum, que é o pior tipo de avaria.
 */

const ACENTUADAS = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SIMPLES = 'aaaaaeeeeiiiiooooouuuucn';

/** Minúsculas e sem acentos, igual ao lado da base de dados. */
export function normalizar(texto: string): string {
  let saida = '';
  for (const letra of texto.toLowerCase()) {
    const i = ACENTUADAS.indexOf(letra);
    saida += i === -1 ? letra : SIMPLES[i];
  }
  return saida;
}

/**
 * O que se põe dentro do `%...%`.
 *
 * `_` e `%` são caracteres especiais do LIKE: `%` sozinho traria a base de
 * dados inteira e `_` casaria com qualquer letra. Quem escreve um deles quer
 * o caractere, não o curinga.
 */
export function paraLike(termo: string): string {
  return normalizar(termo.trim()).replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Um número de telefone escrito de qualquer maneira, reduzido a algarismos.
 *
 * Quem procura escreve "912 345 678" ou "912345678"; na base está gravado das
 * duas formas e ainda em "+351912345678". Só os algarismos põem os três a
 * bater — e é por isso que `procura_texto` também os guarda assim.
 */
export function soDigitos(texto: string): string {
  return texto.replace(/[^0-9]/g, '');
}

/** Quantos algarismos tem de ter para valer a pena procurar como telefone. */
export const DIGITOS_MINIMOS = 6;

/**
 * O que procurar, a partir do que a pessoa escreveu.
 *
 * Devolve `null` quando não vale a pena ir à base de dados: menos de dois
 * caracteres traria metade dos 3745 comércios e não ajudava ninguém.
 */
export function prepararTermo(bruto: string): string | null {
  const limpo = bruto.trim();
  if (limpo.length < 2) return null;

  // Um telefone escrito com espaços — "912 345 678" — normalizado dá
  // "912 345 678" e não batia com os algarismos seguidos que estão guardados.
  const digitos = soDigitos(limpo);
  if (digitos.length >= DIGITOS_MINIMOS && soDigitos(limpo) === limpo.replace(/[\s+()-]/g, '')) {
    return digitos;
  }

  return paraLike(limpo);
}
