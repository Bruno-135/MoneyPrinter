/**
 * Passa os artboards do Claude Design para `artboards.ts`.
 *
 * Da primeira vez isto foi feito à mão, e não devia: o Bruno manda um ZIP
 * novo de cada vez que muda o desenho, e refazer à mão dezasseis pedaços de
 * HTML é uma maneira segura de trocar um por outro sem dar por isso.
 *
 * Corre-se assim:
 *
 *     npx tsx scripts/artboards-da-vaidesign.ts <pasta-do-zip>
 *
 * Não inventa nada. Recorta o que está lá dentro e faz duas trocas, as mesmas
 * que estavam documentadas no ficheiro gerado:
 *
 *   - `<image-slot>` passa a `<img>`, porque aquele elemento só existe dentro
 *     do editor deles e no site não desenha nada;
 *   - os tratadores de eventos do editor saem, porque apontam para funções
 *     que não existem fora dele.
 *
 * Os `<dc-import>` ficam como vêm: são resolvidos em `componentes.ts`, depois
 * de o motor encher o molde, porque alguns recebem props que só existem a
 * meio de um `sc-for`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** As cinco páginas: ficheiro, nome no mapa, e o rótulo de cada largura. */
const PAGINAS = [
  ['Inicio', 'inicio'],
  ['Servicos', 'servicos'],
  ['Modelos', 'modelos'],
  ['Sobre', 'sobre'],
  ['Contacto', 'contacto'],
] as const;

/** Os quatro componentes, que o desenho guarda em ficheiros só deles. */
const COMPONENTES = [
  ['Cabecalho', 'comp-cabecalho'],
  ['FichaModelo', 'comp-ficha-modelo'],
  ['Logotipo', 'comp-logotipo'],
  ['Rodape', 'comp-rodape'],
] as const;

/**
 * O fim da etiqueta que abre em `inicio`, contando as que abrem lá dentro.
 *
 * Contar tags é preciso porque os artboards são divisões dentro de divisões,
 * dezenas delas, e procurar o próximo `</div>` dava sempre o sítio errado.
 */
function fimDaEtiqueta(html: string, inicio: number, nome: string): number {
  const abre = new RegExp(`<${nome}\\b`, 'g');
  const fecha = new RegExp(`</${nome}>`, 'g');
  let i = html.indexOf('>', inicio) + 1;
  let profundidade = 1;

  while (i < html.length) {
    abre.lastIndex = i;
    fecha.lastIndex = i;
    const a = abre.exec(html);
    const f = fecha.exec(html);
    if (!f) throw new Error(`<${nome}> sem fecho`);

    if (a && a.index < f.index) {
      profundidade += 1;
      i = a.index + 1;
      continue;
    }
    profundidade -= 1;
    if (profundidade === 0) return f.index + `</${nome}>`.length;
    i = f.index + 1;
  }
  throw new Error(`<${nome}> sem fecho`);
}

/**
 * `<image-slot>` passa a `<img>`, com tudo o que isso implica.
 *
 * O `<image-slot>` é um elemento do editor deles e traz os seus próprios
 * atributos. Trocar só o nome da etiqueta não chega: o resultado seria um
 * `<img>` sem `alt`, sem estilo, e com meia dúzia de atributos que o browser
 * não conhece.
 *
 * A conversão, atributo a atributo:
 *
 *   - `placeholder` → `alt`. É a descrição da fotografia, escrita por quem
 *     desenhou, e é o que um leitor de ecrã vai ler.
 *   - `mask` → `clip-path`, no estilo. É o recorte da imagem — sem isto a
 *     fotografia da equipa sai quadrada onde o desenho a queria arredondada.
 *   - `credit` e `credit-href` saem. São a atribuição do Unsplash e servem
 *     dentro do editor; num `<img>` não fazem nada.
 *   - `shape` e `id` saem, que são do editor.
 *
 * E acrescenta-se o que uma fotografia num site precisa e o editor não tem de
 * saber: `loading="lazy"` e o preenchimento da caixa.
 *
 * Isto estava a ser feito à mão na primeira extracção. Uma conversão de dez
 * atributos repetida à mão de cada vez que chega um ZIP é uma que se faz mal
 * à terceira.
 */
function converterImagem(etiqueta: string): string {
  const atributo = (nome: string): string | null => {
    const achou = new RegExp(`\\b${nome}="([^"]*)"`).exec(etiqueta);
    return achou ? achou[1]! : null;
  };

  const src = atributo('src') ?? '';
  const alt = atributo('placeholder') ?? '';
  const recorte = atributo('mask');
  const estilo = atributo('style');

  const partes = [
    'display:block',
    'width:100%',
    'height:100%',
    'object-fit:cover',
    recorte ? `clip-path:${recorte}` : '',
  ].filter(Boolean);

  // O estilo próprio do slot vem primeiro: é o que o coloca na página.
  const tudo = estilo ? `${estilo};${partes.join(';')}` : partes.join(';');

  return `<img src="${src}" alt="${alt}" loading="lazy" style="${tudo}">`;
}

/** As trocas, e mais nada. */
function limpar(html: string): string {
  return (
    html
      .replace(/<image-slot\b[^>]*>/g, converterImagem)
      .replace(/<\/image-slot>/g, '')
      // `on[A-Za-z]+` e não `on[a-z]+`: o desenho escreve-os em camelCase
      // (`onMouseEnter`), e a primeira versão disto deixou-os todos passar.
      .replace(/\s+on[A-Za-z]+="[^"]*"/g, '')
      // As fotografias: no ZIP vivem numa pasta ao lado do HTML, no site vivem
      // em `public/` e são servidas pela raiz.
      .replace(/src="assets\//g, 'src="/vaidesign/')
  );
}

/** O corpo de um componente: tudo entre `<x-dc>` e `</x-dc>`, sem o helmet. */
function componente(html: string): string {
  const abre = html.indexOf('<x-dc>');
  const fecha = html.lastIndexOf('</x-dc>');
  if (abre === -1 || fecha === -1) throw new Error('ficheiro sem <x-dc>');

  let dentro = html.slice(abre + '<x-dc>'.length, fecha);
  const helmet = dentro.indexOf('<helmet>');
  if (helmet !== -1) {
    dentro = dentro.slice(0, helmet) + dentro.slice(dentro.indexOf('</helmet>') + '</helmet>'.length);
  }
  return limpar(dentro).trim();
}

/**
 * O artboard de uma largura.
 *
 * Cada ecrã do desenho é um `<div data-screen-label="...">` com um rótulo em
 * letra pequena por cima — «INÍCIO · COMPUTADOR 1440» — e, a seguir, a
 * divisão com a largura certa. É essa última que é o site; o rótulo é a
 * legenda da tela e não entra.
 */
function artboard(html: string, largura: 390 | 1440): string {
  const marca = `width:${largura}px`;
  const em = html.indexOf(marca);
  if (em === -1) throw new Error(`não há nenhum artboard de ${largura}px`);

  const inicio = html.lastIndexOf('<div', em);
  return limpar(html.slice(inicio, fimDaEtiqueta(html, inicio, 'div'))).trim();
}

function principal(): void {
  const pasta = process.argv[2];
  if (!pasta) throw new Error('falta a pasta do ZIP');

  const entradas: [string, string][] = [];

  for (const [ficheiro, chave] of COMPONENTES) {
    const html = readFileSync(join(pasta, `${ficheiro}.dc.html`), 'utf8');
    entradas.push([chave, componente(html)]);
  }

  for (const [ficheiro, chave] of PAGINAS) {
    const html = readFileSync(join(pasta, `${ficheiro}.dc.html`), 'utf8');
    for (const largura of [1440, 390] as const) {
      entradas.push([`${chave}-${largura}`, artboard(html, largura)]);
    }
  }

  entradas.sort(([a], [b]) => a.localeCompare(b));

  const corpo = entradas
    .map(([chave, html]) => `  '${chave}': \`${html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``)
    .join(',\n');

  const saida = `/**
 * Os artboards do desenho da VaiDesign, saídos do Claude Design.
 *
 * GERADO — não editar à mão. Refaz-se com:
 *
 *     npx tsx scripts/artboards-da-vaidesign.ts <pasta-do-zip>
 *
 * Cada entrada é o \`<div>\` de um artboard, ou o corpo de um componente, com
 * as tags equilibradas e duas únicas mudanças: \`<image-slot>\` passou a
 * \`<img>\` (o elemento só existe dentro do editor deles) e os tratadores de
 * eventos do editor saíram. A estrutura, as cores e os espaçamentos são os do
 * desenho.
 *
 * Os \`<dc-import>\` ficam como vieram: são resolvidos em \`componentes.ts\`,
 * depois de o motor encher o molde, porque alguns recebem props que só
 * existem a meio de um \`sc-for\`.
 */

export const ARTBOARDS = {
${corpo},
} as const;

export type NomeDeArtboard = keyof typeof ARTBOARDS;
`;

  writeFileSync('src/lib/vaidesign/desenho/artboards.ts', saida);
  for (const [chave, html] of entradas) {
    console.log(`${chave.padEnd(20)} ${String(html.length).padStart(7)} bytes`);
  }
}

principal();
