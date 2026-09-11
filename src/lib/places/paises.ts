/**
 * Os países onde se prospeta, com o nome escrito por extenso.
 *
 * Estava um `=== 'BR' ? 'Brasil' : 'Portugal'` dentro de `cityQueryText`, o que
 * chegava enquanto o nome do país só servia para montar a pergunta ao Google.
 * Com o filtro de país no painel passa a haver um segundo sítio a precisar do
 * mesmo, e dois `if` a decidir o mesmo acabam sempre por discordar.
 *
 * "Portugal" como omissão não é neutralidade — é o país onde o produto começou
 * e onde está a maior parte dos dados. Um código desconhecido mostra-se tal e
 * qual em vez de ser silenciosamente convertido em Portugal: se aparecer um
 * 'ES' na lista, é melhor vê-lo do que vê-lo mentir.
 */

export const PAISES = {
  PT: 'Portugal',
  BR: 'Brasil',
} as const;

export type CodigoPais = keyof typeof PAISES;

export function ehCodigoPais(valor: unknown): valor is CodigoPais {
  return typeof valor === 'string' && valor in PAISES;
}

export function nomeDoPais(codigo: string): string {
  const cima = codigo.toUpperCase();
  return ehCodigoPais(cima) ? PAISES[cima] : codigo;
}
