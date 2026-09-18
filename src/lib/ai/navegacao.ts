/**
 * O menu que a IA tem de escrever em cada página.
 *
 * Num módulo só seu, e sem dependências nenhumas: é uma função pura sobre
 * texto, e `generate.ts` puxa o cliente da Anthropic, que valida variáveis de
 * ambiente logo ao ser importado. Sem esta separação, um teste a estas regras
 * precisava de uma chave de API para correr — e o defeito que elas agora
 * apanham custou uma página inteira com o menu morto.
 */

/** Uma página do site, para o menu que a IA tem de escrever. */
export interface PaginaParaMenu {
  titulo: string;
  endereco: string;
  /** true na página que está a ser gerada agora. */
  atual: boolean;
}

/**
 * As regras do menu, quando o site tem mais do que uma página.
 *
 * Existe porque um site de várias páginas em que cada página foi gerada
 * sozinha não é um site: é um conjunto de landing pages sem saída. O menu tem
 * de estar em TODAS e apontar para as mesmas moradas.
 *
 * Os endereços vão escritos por extenso e com a ordem de os não inventar. A IA
 * não tem como adivinhar o código público do site, e um menu com moradas
 * inventadas dá uma página cheia de links partidos — que é pior do que não ter
 * menu nenhum.
 */
export function navegacaoRegras(paginas: readonly PaginaParaMenu[]): string {
  // Um site de uma página SÓ precisa desta regra tanto como os outros, e foi
  // por não a ter que saiu a primeira loja com o menu morto: a folha do modelo
  // manda escrever um menu de seis entradas, aqui não ia endereço nenhum, e a
  // IA escreveu dez <a> sem href. Texto cinzento que não leva a lado nenhum.
  if (paginas.length < 2) {
    return `
ESTE SITE TEM UMA PÁGINA SÓ. Se escreveres um menu no topo — e deves —, cada
entrada aponta para uma SECÇÃO desta mesma página, com <a href="#id"> e o mesmo id
posto na secção correspondente. Não inventes páginas que não existem.

NENHUM <a> PODE FICAR SEM href. Um <a> sem href não é um link: não se carrega,
não muda de cor e fica com ar de texto apagado. Se não houver para onde
apontar, escreve um <span> — mas um menu que não leva a lado nenhum não serve
para nada, portanto aponta para as secções.`;
  }

  const lista = paginas
    .map((p) => `  - ${p.titulo} → ${p.endereco}${p.atual ? '   (É ESTA a página que estás a escrever)' : ''}`)
    .join('\n');

  return `
ESTE SITE TEM VÁRIAS PÁGINAS. Escreve um menu no topo, igual em todas, com
estas entradas e exactamente estes endereços:
${lista}

- Usa <a href="..."> com o endereço tal e qual está escrito acima. NÃO
  inventes endereços, não acrescentes páginas que não estejam na lista e não
  uses links relativos.
- NENHUM <a> pode ficar sem href. Um <a> sem href não se carrega, não muda de
  cor e parece texto apagado — que é o que uma pessoa vê e não percebe.
- A entrada da página actual fica marcada (sublinhado, peso ou cor), sem link
  ou com link para ela própria.
- Repete o menu no rodapé, em texto simples.
- Escreve SÓ o conteúdo desta página. As outras são geradas à parte — não
  metas aqui o conteúdo delas.`;
}
