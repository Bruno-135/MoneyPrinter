/**
 * Um endereço serve para `<img src>`?
 *
 * Nasceu de um caso real: um catálogo ficou com dois endereços do Pixabay que
 * eram PÁGINAS — `pixabay.com/pt/photos/casaco-…-3619797/` — e não ficheiros.
 * A página aceitou-os porque só olhava ao `https://`, e o que apareceu na loja
 * foi o quadrado partido do browser. Pior: a peça parecia cadastrada ao dono e
 * partida ao cliente.
 *
 * A regra é simples e propositadamente estreita: ou o caminho acaba numa
 * extensão de imagem, ou é do nosso próprio armazenamento, onde só entram
 * ficheiros que nós lá pusemos. Tudo o resto é recusado com uma explicação —
 * um endereço recusado com motivo vale mais do que um aceite que não carrega.
 */

const EXTENSOES = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

/** As fontes onde sabemos que o endereço aponta a um ficheiro. */
const CASAS_CONHECIDAS = ['images.pexels.com', 'images.unsplash.com', 'cdn.pixabay.com'];

export interface Veredicto {
  serve: boolean;
  /** O que dizer a quem colou isto, quando não serve. */
  porque?: string;
}

export function julgarEndereco(bruto: string): Veredicto {
  const limpo = bruto.trim();
  if (limpo === '') return { serve: false, porque: 'Endereço vazio.' };

  let url: URL;
  try {
    url = new URL(limpo);
  } catch {
    return { serve: false, porque: 'Isto não é um endereço.' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { serve: false, porque: 'Só endereços http ou https.' };
  }

  const caminho = url.pathname.toLowerCase();
  if (EXTENSOES.some((e) => caminho.endsWith(e))) return { serve: true };

  // O nosso armazenamento não põe extensão em todos os caminhos, e o que lá
  // está fomos nós que carregámos.
  if (url.pathname.includes('/storage/v1/object/public/')) return { serve: true };

  if (CASAS_CONHECIDAS.includes(url.hostname)) return { serve: true };

  return {
    serve: false,
    porque:
      `"${url.hostname}" devolve uma PÁGINA e não uma imagem. ` +
      'Carrega a fotografia no botão acima, ou usa o endereço do ficheiro — ' +
      'o que acaba em .jpg ou .png.',
  };
}

/** Só os que servem, com os motivos dos que ficaram de fora. */
export function filtrarEnderecos(brutos: readonly string[]): {
  bons: string[];
  recusados: string[];
} {
  const bons: string[] = [];
  const recusados: string[] = [];

  for (const bruto of brutos) {
    const v = julgarEndereco(bruto);
    if (v.serve) bons.push(bruto.trim());
    else if (bruto.trim() !== '') recusados.push(v.porque ?? bruto);
  }

  return { bons, recusados };
}
