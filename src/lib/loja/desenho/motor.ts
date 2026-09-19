/**
 * O motor que enche os artboards do Claude Design.
 *
 * O desenho vem numa linguagem própria, e é bom que venha: em vez de eu
 * adivinhar onde vão os dados, ele DIZ onde vão.
 *
 *   {{ p.name }}                          um valor
 *   <sc-for list="{{ destaques }}" as="p" hint-placeholder-count="4">
 *   <sc-if value="{{ p.tag }}" hint-placeholder-val="{{ true }}">
 *
 * A regra que manda em tudo: a ESTRUTURA não se toca. Trocam-se valores,
 * repetem-se ciclos e escondem-se condições — mais nada. Foi por eu ter
 * reescrito a estrutura que as versões anteriores nunca ficaram iguais.
 *
 * Sem dados, o ciclo desenha `hint-placeholder-count` cópias vazias: é assim
 * que as caixas às riscas com a medida ficam na página, que é o que se quer
 * mostrar a um comerciante que ainda não tem catálogo.
 */

export type Valor = string | number | boolean | null | undefined;
export type Item = Record<string, Valor>;
export type Contexto = Record<string, Valor | Item | Item[] | undefined>;

/** `{{ a.b }}` → o valor, ou undefined. Sem eval e sem expressões. */
function ler(contexto: Contexto, caminho: string): unknown {
  const partes = caminho.trim().split('.');
  let atual: unknown = contexto;

  for (const parte of partes) {
    if (atual === null || atual === undefined) return undefined;
    if (typeof atual !== 'object') return undefined;
    atual = (atual as Record<string, unknown>)[parte];
  }
  return atual;
}

/** O que escapar antes de pôr num atributo ou no texto. */
export function escapar(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Verdadeiro à maneira do desenho.
 *
 * A string vazia é falsa — uma peça sem etiqueta não deve mostrar a caixinha
 * da etiqueta vazia, que ficaria um rectângulo sem nada lá dentro.
 */
function verdadeiro(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (v === '' || v === 0) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** O elemento inteiro que começa em `inicio`, com as tags equilibradas. */
function elemento(texto: string, inicio: number, etiqueta: string): { inner: string; fim: number } {
  const abre = new RegExp(`<${etiqueta}\\b[^>]*>`, 'gi');
  const fecha = new RegExp(`</${etiqueta}\\s*>`, 'gi');

  const primeiro = new RegExp(`<${etiqueta}\\b[^>]*>`, 'i').exec(texto.slice(inicio));
  if (!primeiro) throw new Error(`<${etiqueta}> não abre em ${inicio}`);
  const depoisDeAbrir = inicio + primeiro.index + primeiro[0].length;

  let profundidade = 1;
  let i = depoisDeAbrir;

  while (profundidade > 0) {
    abre.lastIndex = i;
    fecha.lastIndex = i;
    const a = abre.exec(texto);
    const f = fecha.exec(texto);
    if (!f) throw new Error(`<${etiqueta}> sem fecho`);

    if (a && a.index < f.index) {
      profundidade += 1;
      i = a.index + a[0].length;
    } else {
      profundidade -= 1;
      i = f.index + f[0].length;
      if (profundidade === 0) {
        return { inner: texto.slice(depoisDeAbrir, f.index), fim: i };
      }
    }
  }
  throw new Error('inalcançável');
}

const ATRIBUTO = (nome: string) => new RegExp(`${nome}="\\{\\{\\s*([^}]+?)\\s*\\}\\}"`, 'i');
const ATRIBUTO_SIMPLES = (nome: string) => new RegExp(`${nome}="([^"]*)"`, 'i');

/** Troca `{{ … }}` pelos valores. Não toca em mais nada. */
function valores(html: string, contexto: Contexto): string {
  return html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_todo, caminho: string) => {
    const bruto = caminho.trim();
    // `{{ true }}` e `{{ false }}` aparecem nas dicas do desenho e não são
    // caminhos. Se sobrarem, saem vazios em vez de escritos na página.
    if (bruto === 'true' || bruto === 'false') return '';
    const v = ler(contexto, bruto);
    return escapar(v);
  });
}

/**
 * Enche um artboard.
 *
 * Trata `sc-for` e `sc-if` de dentro para fora, e só no fim troca os valores —
 * assim um `{{ p.name }}` dentro de um ciclo vê o `p` do ciclo e não o de fora.
 */
export function encher(html: string, contexto: Contexto): string {
  let saida = html;

  // Enquanto houver ciclos ou condições por resolver. A cada volta trata-se a
  // PRIMEIRA que aparece, que é sempre a mais exterior por essa altura.
  for (let volta = 0; volta < 500; volta += 1) {
    const cicloEm = saida.search(/<sc-for\b/i);
    const condicaoEm = saida.search(/<sc-if\b/i);

    if (cicloEm === -1 && condicaoEm === -1) break;
    const primeiro = cicloEm === -1 ? condicaoEm : condicaoEm === -1 ? cicloEm : Math.min(cicloEm, condicaoEm);
    const eCiclo = primeiro === cicloEm;

    const etiqueta = eCiclo ? 'sc-for' : 'sc-if';
    const tagAbre = new RegExp(`<${etiqueta}\\b[^>]*>`, 'i').exec(saida.slice(primeiro))![0];
    const { inner, fim } = elemento(saida, primeiro, etiqueta);

    let substituto = '';

    if (eCiclo) {
      const lista = ATRIBUTO('list').exec(tagAbre);
      const como = ATRIBUTO_SIMPLES('as').exec(tagAbre)?.[1] ?? 'item';
      const quantosPorOmissao = Number(
        ATRIBUTO_SIMPLES('hint-placeholder-count').exec(tagAbre)?.[1] ?? '0',
      );

      const bruto = lista ? ler(contexto, lista[1]!) : undefined;
      const itens = Array.isArray(bruto) ? (bruto as Item[]) : null;

      if (itens && itens.length > 0) {
        substituto = itens.map((item) => encher(inner, { ...contexto, [como]: item })).join('');
      } else {
        // Sem dados fica o desenho: N cópias com os campos vazios, ou seja as
        // caixas às riscas com a medida lá dentro. É o que se mostra a quem
        // ainda não tem catálogo.
        substituto = Array.from({ length: Math.max(0, quantosPorOmissao) }, () =>
          encher(inner, { ...contexto, [como]: {} }),
        ).join('');
      }
    } else {
      const valorAttr = ATRIBUTO('value').exec(tagAbre);
      const v = valorAttr ? ler(contexto, valorAttr[1]!) : undefined;
      substituto = verdadeiro(v) ? encher(inner, contexto) : '';
    }

    saida = saida.slice(0, primeiro) + substituto + saida.slice(fim);
  }

  return valores(saida, contexto);
}
