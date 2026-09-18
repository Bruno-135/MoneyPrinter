/**
 * Prende o CSS de uma página gerada ao seu próprio contentor.
 *
 * O PROBLEMA, que apareceu em produção e é subtil: a página gerada declara as
 * suas cores em `:root` — `:root{--bg:#0B0E12}`. Mas `:root` é o `<html>` do
 * documento, e o painel TAMBÉM lá tem tokens com esses nomes: `--bg`, `--surf`,
 * `--line`, `--ink`. Os do painel estão em `:root[data-theme='light']`, que tem
 * especificidade (0,1,1) contra os (0,0,1) da página.
 *
 * Em modo escuro os dois ficam em `:root` puro, empatam, e ganha o último a
 * entrar no documento — que é o da página. Parece tudo bem.
 *
 * Em modo claro o do painel ganha: o `--bg` da página passa a quase branco e o
 * texto fica no `#E8ECF2` que ela escolheu. Branco sobre branco. A página
 * desaparece, e só no tema claro — que é exactamente o sintoma que se viu.
 *
 * A SOLUÇÃO: reescrever `:root`, `html` e `body` para a classe do contentor.
 * As propriedades personalizadas HERDAM, e a herança ganha-se por PROXIMIDADE,
 * não por especificidade: um `--bg` posto num avô próximo vence o do `<html>`
 * para tudo o que está lá dentro, por muito específico que o outro seja.
 *
 * De passagem resolve outra coisa: uma página que escrevesse
 * `body{background:#000}` pintava o painel inteiro de preto. Já não pode.
 *
 * Feito na LEITURA e não na escrita, ao contrário da limpeza: assim as páginas
 * que já estão gravadas ficam certas sem migração nenhuma.
 */

/** A classe do contentor onde a página gerada vive. */
export const CLASSE_DO_CONTENTOR = 'site-gerado';

/**
 * Os selectores do documento hospedeiro, em posição de selector.
 *
 * A parte de trás — `(?=[\s,{:.\[>~+])` — é o que impede apanhar `body` dentro
 * de `.body-grande` ou de uma palavra qualquer no meio de um valor. E a da
 * frente exige que venha no princípio de um selector: início do bloco, depois
 * de `{`, de `}`, de `,` ou de uma quebra de linha.
 */
const HOSPEDEIRO = /(^|[{}\n;,])(\s*)(:root|html|body)(?=[\s,{:.[>~+])/g;

/** Um bloco `<style>…</style>`, com o miolo à parte. */
const BLOCO_STYLE = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;

function reescreverSelectores(css: string): string {
  return css.replace(HOSPEDEIRO, (_todo, antes: string, espaco: string) => {
    return `${antes}${espaco}.${CLASSE_DO_CONTENTOR}`;
  });
}

/**
 * O HTML da página com o CSS preso ao contentor.
 *
 * Só mexe no que está dentro de `<style>`. O resto do documento — incluindo
 * texto que por acaso diga "body" — fica exactamente como estava.
 */
export function escoparCssDaPagina(html: string): string {
  return html.replace(BLOCO_STYLE, (_todo, abre: string, miolo: string, fecha: string) => {
    return `${abre}${reescreverSelectores(miolo)}${fecha}`;
  });
}
