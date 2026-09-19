/**
 * Os links do desenho, apontados ao site do cliente.
 *
 * O desenho foi feito como se a loja fosse a raiz de um domínio: `/mulher`,
 * `/peca`, `tel:+351912345678`, `wa.me/351912345678`. No sistema, a loja vive
 * em `/s/<código>` e o telefone é o do comerciante — e enquanto isto não se
 * fez, carregar em qualquer entrada do menu dava 404.
 *
 * Reescreve-se na leitura e não no artboard porque o código público muda de
 * site para site: gravar `/s/7z8kxnevid/mulher` no ficheiro do desenho servia
 * uma loja e partia todas as outras.
 */

/** As páginas que existem mesmo. O resto fica como está. */
const PAGINAS = ['inicio', 'mulher', 'homem', 'peca', 'como-comprar', 'contacto'];

export interface DestinosDaLoja {
  /** `/s/<código>` — onde a loja vive. */
  raiz: string;
  /** O número do comerciante, em E.164 ou como estiver. */
  whatsapp: string | null;
  telefone: string | null;
  email: string | null;
}

/** Só os algarismos, que é o que o `wa.me` aceita. */
function digitos(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

function destinoInterno(caminho: string, raiz: string): string | null {
  const limpo = caminho.split('?')[0]!.split('#')[0]!;
  const partes = limpo.split('/').filter((p) => p !== '');
  if (partes.length === 0) return raiz;

  const primeira = partes[0]!;
  if (!PAGINAS.includes(primeira)) return null;

  // `/inicio` é a raiz e não `/s/<código>/inicio`: a inicial não tem endereço
  // próprio, e um menu a apontar para os dois sítios ao mesmo tempo mostrava a
  // entrada "Início" acesa numa página e apagada na outra.
  if (primeira === 'inicio' && partes.length === 1) return raiz;

  return `${raiz}/${partes.join('/')}`;
}

export function reescreverLinks(html: string, destinos: DestinosDaLoja): string {
  const { raiz, whatsapp, telefone, email } = destinos;

  return html.replace(/href="([^"]*)"/g, (todo, url: string) => {
    // Âncoras dentro da página: as do desenho que servem para saltar entre
    // artboards da TELA (#1d, #2a, #1g) não querem dizer nada num site, e
    // deixá-las levava a pessoa a lado nenhum sem dizer porquê.
    if (url.startsWith('#')) {
      return /^#\d[a-h]$/i.test(url) ? 'href="#"' : todo;
    }

    if (url.startsWith('tel:')) {
      return telefone ? `href="tel:${telefone}"` : todo;
    }

    if (url.startsWith('mailto:')) {
      return email ? `href="mailto:${email}"` : todo;
    }

    // O WhatsApp do desenho é um número de exemplo. O texto da mensagem
    // MANTÉM-SE: foi escrito com cuidado e continua a servir.
    const wa = /^https:\/\/wa\.me\/(\d+)(.*)$/.exec(url);
    if (wa) {
      if (!whatsapp) return todo;
      return `href="https://wa.me/${digitos(whatsapp)}${wa[2] ?? ''}"`;
    }

    if (url.startsWith('/')) {
      const destino = destinoInterno(url, raiz);
      return destino ? `href="${destino}"` : todo;
    }

    return todo;
  });
}
