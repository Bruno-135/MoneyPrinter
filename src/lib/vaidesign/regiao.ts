/**
 * O mesmo site, para os dois lados do Atlântico.
 *
 * A VaiDesign vende em Portugal e no Brasil, e o desenho está escrito em
 * português de Portugal. Um brasileiro percebe «telemóvel» pelo contexto — não
 * é aí que o perde. Perde-se no «0 €» em cima da página e nas sete maquetes
 * todas com cidades portuguesas, que juntos dizem, sem dizer, «isto é uma
 * empresa de lá».
 *
 * Por isso isto troca duas coisas diferentes e é bom não as confundir:
 *
 *   - as PALAVRAS que mudam de um país para o outro («telemóvel» → «celular»);
 *   - os EXEMPLOS de dentro das maquetes dos modelos — as cidades, a moeda, os
 *     preços — que não são palavras, são a prova de onde a agência trabalha.
 *
 * A troca é feita sobre o HTML já montado, e SÓ NO TEXTO QUE SE VÊ. Nunca
 * dentro de uma etiqueta: `name="contacto"` é o nome de um campo que o
 * servidor lê, e trocá-lo por `name="contato"` partia o formulário sem deixar
 * rasto — o mesmo tipo de avaria calada que já custou dias neste site.
 */

export const REGIOES = ['pt', 'br'] as const;
export type Regiao = (typeof REGIOES)[number];

export const REGIAO_POR_OMISSAO: Regiao = 'pt';

/** O prefixo de rota de cada região. Portugal não leva nenhum: é a raiz. */
export const PREFIXO: Record<Regiao, string> = { pt: '', br: '/br' };

export const NOME_DA_REGIAO: Record<Regiao, string> = {
  pt: 'Portugal',
  br: 'Brasil',
};

/** O que cada região diz no `lang` da página. */
export const LINGUA: Record<Regiao, string> = { pt: 'pt-PT', br: 'pt-BR' };

/**
 * As palavras, da mais longa para a mais curta.
 *
 * A ordem importa: «telemóvel ou email» tem de ser trocado antes de
 * «telemóvel», senão a primeira troca come a segunda e sobra um fim de frase
 * meio traduzido.
 *
 * Só entram palavras que um brasileiro não diria. «Site», «negócio»,
 * «proposta» e «prazo» ficam: são iguais nos dois lados, e traduzir o que não
 * precisa é a maneira mais rápida de um texto ficar com cara de tradução.
 */
const PALAVRAS: readonly (readonly [string, string])[] = [
  // O contacto, em todas as formas em que o site o escreve.
  ['Telemóvel ou email', 'Celular ou email'],
  ['telemóveis', 'celulares'],
  ['Telemóveis', 'Celulares'],
  ['telemóvel', 'celular'],
  ['Telemóvel', 'Celular'],
  ['Contacto', 'Contato'],
  ['contacto', 'contato'],
  ['Contactos', 'Contatos'],
  ['contactos', 'contatos'],
  ['contactar', 'contatar'],
  ['Contactar', 'Contatar'],
  ['contactado', 'contatado'],
  ['connosco', 'conosco'],
  ['Connosco', 'Conosco'],

  // O resto do vocabulário do dia a dia.
  ['ecrã', 'tela'],
  ['Ecrã', 'Tela'],
  ['ficheiros', 'arquivos'],
  ['ficheiro', 'arquivo'],
  ['à medida', 'sob medida'],
  ['À medida', 'Sob medida'],
  ['morada', 'endereço'],
  ['Morada', 'Endereço'],
  ['carregue em', 'clique em'],
  ['Carregue em', 'Clique em'],
  ['carregar no botão', 'clicar no botão'],
  ['utilizadores', 'usuários'],
  ['utilizador', 'usuário'],
  ['percebe', 'entende'],
  ['Percebe', 'Entende'],
  ['ao vivo', 'ao vivo'],
  ['dias úteis', 'dias úteis'],
  ['dá jeito', 'dá certo'],
  ['de borla', 'de graça'],

  // As maquetes dos modelos: as cidades e a moeda são a prova de onde se
  // trabalha, e num site para o Brasil têm de ser de lá.
  ['Casas em Braga', 'Casas em Curitiba'],
  ['Nutricionista · Porto', 'Nutricionista · Curitiba'],
  ['Setúbal', 'Santos'],
  ['245 000 €', 'R$ 780.000'],
  ['310 000 €', 'R$ 990.000'],
  ['49 €', 'R$ 259'],
  ['19 €', 'R$ 99'],
  ['Porto Coimbra', 'São Paulo'],
] as const;

/** Troca só no texto que se vê, nunca dentro de uma etiqueta. */
function trocarNoTexto(html: string, trocas: readonly (readonly [string, string])[]): string {
  if (trocas.length === 0) return html;

  let saida = '';
  let i = 0;

  while (i < html.length) {
    const abre = html.indexOf('<', i);
    const texto = abre === -1 ? html.slice(i) : html.slice(i, abre);

    let trocado = texto;
    for (const [de, para] of trocas) trocado = trocado.split(de).join(para);
    saida += trocado;

    if (abre === -1) break;

    const fecha = html.indexOf('>', abre);
    if (fecha === -1) {
      saida += html.slice(abre);
      break;
    }
    saida += html.slice(abre, fecha + 1);
    i = fecha + 1;
  }

  return saida;
}

/** O HTML de uma página, na língua e com os exemplos da região. */
export function regionalizar(html: string, regiao: Regiao): string {
  return regiao === 'br' ? trocarNoTexto(html, PALAVRAS) : html;
}

/**
 * A mesma página na outra região.
 *
 * Serve o botão de trocar: quem está em `/servicos` e carrega em «Brasil» vai
 * para `/br/servicos` e não para a entrada do site. Mandar alguém para a
 * primeira página só porque trocou de país é fazê-lo perder o que estava a ler.
 */
export function mesmaPaginaNoutraRegiao(caminho: string, destino: Regiao): string {
  // `/br` e `/br/...`, mas não `/branding`: começar pelas mesmas três letras
  // não faz de uma rota a versão do Brasil de nada.
  const naRegiaoBr = caminho === '/br' || caminho.startsWith('/br/');
  const semPrefixo = naRegiaoBr ? caminho.slice(3) || '/' : caminho;
  if (destino === 'pt') return semPrefixo;
  return semPrefixo === '/' ? '/br' : `/br${semPrefixo}`;
}
