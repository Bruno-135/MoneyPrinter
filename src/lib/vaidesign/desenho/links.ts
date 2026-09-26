/**
 * Os links do desenho passados para os endereços do site.
 *
 * No Claude Design cada página é um ficheiro ao lado do outro, e as âncoras
 * `#1a`, `#selo-d` e afins apontam para artboards dentro da tela. Nenhuma
 * dessas coisas existe aqui: as páginas são rotas e os artboards não são
 * sítios. A troca faz-se na leitura, e não no artboard — o desenho fica como
 * veio, e se um dia vier outro, este ficheiro continua a servir.
 */

/** Cada página do desenho e a rota onde vive. */
export const ROTAS: Record<string, string> = {
  'Inicio.dc.html': '/',
  'Servicos.dc.html': '/servicos',
  'Modelos.dc.html': '/modelos',
  'Sobre.dc.html': '/sobre',
  'Contacto.dc.html': '/contacto',
};

/** As âncoras que apontam para artboards da tela, não para secções da página. */
const ANCORAS_DA_TELA = new Set(['#1a', '#sb-d', '#sb-m', '#selo-d', '#selo-m']);

export interface Destinos {
  /** O número de WhatsApp em formato internacional, só dígitos. */
  whatsapp?: string | null;
  /**
   * O prefixo das rotas: vazio em Portugal, `/br` no Brasil.
   *
   * Sem isto, um brasileiro que carregue em «Serviços» dentro da versão dele
   * cai na versão portuguesa e não percebe porquê. Um site em duas versões
   * onde os links de uma levam à outra é pior do que um site numa só.
   */
  prefixo?: string;
}

export function reescreverLinks(html: string, destinos: Destinos = {}): string {
  return html.replace(/href="([^"]*)"/g, (inteiro, alvo: string) => {
    const rota = ROTAS[alvo];
    if (rota) {
      const prefixo = destinos.prefixo ?? '';
      // A raiz com prefixo é o prefixo: `/br`, e não `/br/`.
      return `href="${rota === '/' ? prefixo || '/' : prefixo + rota}"`;
    }

    if (alvo === '#whatsapp') {
      // Sem número, o botão leva à página de contacto em vez de não levar a
      // lado nenhum. Um botão que não faz nada num site de agência é pior do
      // que não ter botão.
      return destinos.whatsapp
        ? `href="https://wa.me/${destinos.whatsapp}"`
        : `href="${destinos.prefixo ?? ''}/contacto"`;
    }

    if (ANCORAS_DA_TELA.has(alvo)) return 'href="#"';

    return inteiro;
  });
}
