/**
 * Passa um documento do Claude Design a HTML que se abre sozinho.
 *
 * Os `.dc.html` que saem de lá vão buscar o React ao `unpkg.com` e só depois
 * desenham o que já está escrito dentro do `<x-dc>`. Enquanto o React não
 * chega, o documento está `display:none` — ou seja, uma folha em branco.
 *
 * Isso é frágil de duas maneiras, e as duas dão pelo mesmo resultado no pior
 * momento: com a internet lenta, o cliente que abre a proposta vê branco; numa
 * rede de empresa que bloqueie o unpkg, vê branco para sempre. Uma proposta
 * que não abre não é uma proposta.
 *
 * E é desnecessário: estes documentos não têm um único `{{ }}`, `sc-if` ou
 * `dc-import`. São HTML escrito e parado. O React ali não desenha nada que já
 * não esteja escrito — só o torna visível.
 *
 * Então tira-se o React e mostra-se o que lá está. O documento passa a abrir
 * sem rede nenhuma e sem esperar por servidor de ninguém.
 *
 *     npx tsx scripts/documentos-da-vaidesign.ts <origem.dc.html> <destino.html>
 */

import { readFileSync, writeFileSync } from 'node:fs';

function converter(html: string): string {
  let saida = html;

  // Os scripts do editor: o que carrega o React e o que o arranca.
  saida = saida.replace(/<script[^>]*src="\.\/[a-z-]+\.js"[^>]*><\/script>/g, '');

  // O `<helmet>` do editor não é uma etiqueta de HTML — o que está lá dentro
  // (as letras, os estilos) tem de subir para o `<head>` para valer.
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(saida);
  if (helmet) {
    saida = saida.replace(helmet[0], '');
    saida = saida.replace('</head>', `${helmet[1]}\n</head>`);
  }

  // O `<x-dc>` era escondido à espera do React. Passa a ser uma divisão
  // normal, que é o que já era por baixo.
  saida = saida.replace(/<x-dc>/g, '<div class="documento">').replace(/<\/x-dc>/g, '</div>');

  // O bloco de lógica do editor, que aqui não tem nada para correr.
  saida = saida.replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/g, '');

  /*
   * O `<doc-page>` era o editor a cortar o documento em folhas A4. Sem o
   * script dele, é uma etiqueta que o browser não conhece — e como o próprio
   * documento traz `doc-page:not(:defined){visibility:hidden}`, esconde-se a
   * si mesmo para sempre. Era por isto que a proposta abria em branco.
   *
   * As folhas passam a ser CSS, e ficam melhores do que estavam: cada
   * `.page` é uma A4 a sério, com as margens certas, e ao imprimir cada uma
   * sai numa folha. Uma proposta que se manda a um cliente tem de poder ser
   * impressa sem sair tudo corrido.
   */
  const FOLHAS = `<style>
  body { background: #E8E2D8; }
  .folhas { display: block; }
  .folhas .page {
    /* O conteudo de cada folha esta num position:absolute com inset:0. Sem
       isto, esse inset conta a partir da janela e as quatro folhas empilham-se
       umas em cima das outras - foi o que aconteceu a primeira. */
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 12mm;
    box-sizing: border-box;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(20,18,16,.18);
  }
  @media print {
    body { background: #FFF; }
    .folhas .page { margin: 0; box-shadow: none; break-after: page; }
    .folhas .page:last-child { break-after: auto; }
  }
  @page { size: A4; margin: 0; }
  /* Sem isto, o documento esconde-se à espera de um script que já não existe. */
  doc-page, x-dc, .documento, .folhas { display: block !important; visibility: visible !important; }
  body { visibility: visible !important; }
</style>`;

  saida = saida
    .replace(/<doc-page[^>]*>/g, '<div class="folhas">')
    .replace(/<\/doc-page>/g, '</div>')
    .replace('</head>', `${FOLHAS}\n</head>`);

  return saida;
}

const [origem, destino] = process.argv.slice(2);
if (!origem || !destino) throw new Error('uso: <origem.dc.html> <destino.html>');

const antes = readFileSync(origem, 'utf8');
const depois = converter(antes);
writeFileSync(destino, depois);

const scripts = (depois.match(/<script/g) ?? []).length;
console.log(
  `${destino}: ${Math.round(depois.length / 1024)} KB, ${scripts} scripts (eram ${(antes.match(/<script/g) ?? []).length})`,
);
