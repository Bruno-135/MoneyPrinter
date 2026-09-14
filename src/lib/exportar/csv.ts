/**
 * Uma tabela em CSV que o Excel abre bem à primeira.
 *
 * "Exportar para Excel" costuma sair mal por duas razões que não têm nada a ver
 * com os dados:
 *
 * 1. O SEPARADOR. Em Portugal e no Brasil a vírgula é o separador decimal,
 *    portanto o Excel destes sítios espera PONTO E VÍRGULA entre colunas. Um
 *    ficheiro separado por vírgulas abre com tudo espremido na coluna A, e a
 *    conclusão de quem o abre é que o programa está estragado.
 *
 * 2. OS ACENTOS. Sem a marca de ordem de bytes (BOM) à cabeça, o Excel lê o
 *    ficheiro como se fosse da máquina local e "Padaria São José" aparece
 *    "Padaria SÃ£o JosÃ©". Três bytes no princípio resolvem.
 *
 * Há ainda uma terceira coisa, que é de segurança e não de aparência: ver
 * `protegerDeFormula`.
 */

/** O separador que o Excel de PT e do BR espera. */
export const SEPARADOR = ';';

/** A marca que diz ao Excel que o ficheiro é UTF-8. */
const BOM = '﻿';

/**
 * Impede que uma célula seja lida como fórmula.
 *
 * Os nomes vêm do Google e são escritos por terceiros. Uma célula que comece
 * por `=`, `+`, `-` ou `@` é executada como fórmula ao abrir a folha — e há
 * fórmulas que chamam programas externos. Um comércio chamado `=HYPERLINK(...)`
 * deixa de ser um nome e passa a ser código a correr no computador de quem
 * abriu o ficheiro.
 *
 * A defesa é uma plica à frente: o Excel mostra o texto tal e qual e não o
 * avalia. Vale também para o telefone, que começa por `+` e sem isto era
 * tratado como conta de somar.
 */
export function protegerDeFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

/** Uma célula, pronta a entrar na linha. */
export function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return '';

  const texto = protegerDeFormula(String(valor));

  // Aspas sempre que haja separador, aspas ou mudança de linha lá dentro. As
  // aspas de dentro duplicam-se, que é como o formato manda.
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function paraCsv(
  colunas: readonly string[],
  linhas: readonly (readonly unknown[])[],
): string {
  const cabecalho = colunas.map(celula).join(SEPARADOR);
  const corpo = linhas.map((l) => l.map(celula).join(SEPARADOR));

  // Fim de linha do Windows: é o que o Excel espera, e no Mac e no Linux não
  // faz diferença nenhuma.
  return BOM + [cabecalho, ...corpo].join('\r\n') + '\r\n';
}

/** Nome de ficheiro com a data, para não ficarem cinco "lista.csv" na pasta. */
export function nomeDoFicheiro(base: string, agora: Date = new Date()): string {
  const dia = agora.toISOString().slice(0, 10);
  const limpo = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${limpo || 'lista'}-${dia}.csv`;
}
