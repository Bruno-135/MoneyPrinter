/**
 * Limpeza do HTML gerado, antes de ser guardado.
 *
 * Porque é preciso, se o HTML vem de um modelo e não de um estranho: o **pedido**
 * é escrito por uma pessoa e vai inteiro para dentro do prompt. Um pedido como
 * "e acrescenta um script que…" é uma instrução que o modelo pode seguir. O que
 * sair daí é guardado na base de dados e servido num endereço público, à frente
 * dos clientes do comerciante. Guardar sem limpar seria guardar o que quer que
 * tenha saído dali.
 *
 * A abordagem é uma lista do que PASSA, não do que se bloqueia. Uma lista de
 * proibições esquece sempre um caso — `onpointerrawupdate`, `<embed>`, um
 * `javascript:` com um tabulador no meio. Uma lista do que passa erra, quando
 * erra, deitando fora coisa a mais: a página fica mais pobre, não perigosa.
 *
 * Corre no servidor, sobre uma string, sem DOM. É por isso que está escrito
 * com expressões regulares e não com um analisador: não há `document` numa
 * função da Vercel, e trazer um analisador de HTML inteiro para limpar uma
 * página de padaria seria pagar caro por pouco.
 */

/** Etiquetas que uma landing page precisa. Tudo o resto sai. */
const ALLOWED_TAGS = new Set([
  'section', 'div', 'header', 'footer', 'main', 'article', 'aside', 'nav',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'strong', 'em', 'b', 'i', 'u', 'small', 'br', 'hr',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'style', 'blockquote', 'address', 'time', 'mark',
]);

/**
 * Etiquetas cujo CONTEÚDO também tem de desaparecer.
 *
 * Apagar só a etiqueta `<script>` e deixar o miolo despejaria o código como
 * texto no meio da página. Nestas, vai tudo.
 */
const STRIP_WITH_CONTENT = [
  'script', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math',
];

/** Atributos que passam. `on*` não está aqui, e é esse o ponto. */
const ALLOWED_ATTRS = new Set([
  'class', 'id', 'style', 'href', 'src', 'alt', 'title', 'target', 'rel',
  'width', 'height', 'colspan', 'rowspan', 'datetime', 'loading', 'aria-label',
  'aria-hidden', 'role',
]);

/** Esquemas de URL aceites em `href` e `src`. */
const SAFE_URL = /^(https?:|tel:|mailto:|#|\/)/i;

/** Espaços e caracteres de controlo, que o browser ignora dentro de um URL. */
const IGNORED_IN_URL = /[\u0000-\u0020]/g;

function isSafeUrl(value: string): boolean {
  // Tudo o que é espaço ou caracter de controlo é retirado antes de comparar,
  // e não só do início. "java\tscript:" e "javascript:" são truques
  // conhecidos para esconder o esquema: o browser ignora esses caracteres ao
  // resolver o URL, uma expressão regular ingénua não.
  return SAFE_URL.test(value.replace(IGNORED_IN_URL, ''));
}

/**
 * Limpa os atributos de uma etiqueta de abertura.
 *
 * Devolve a etiqueta reescrita só com o que passou.
 */
function cleanAttributes(tagName: string, attrsSource: string, selfClosing: boolean): string {
  const kept: string[] = [];

  // Nome do atributo, seguido opcionalmente de = e um valor entre aspas,
  // apóstrofos, ou sem nada.
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

  for (const match of attrsSource.matchAll(pattern)) {
    // O grupo do nome faz parte do padrão, mas o TypeScript não sabe disso e
    // tem razão em insistir: uma correspondência vazia daria `undefined` aqui.
    if (!match[1]) continue;

    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    if (!ALLOWED_ATTRS.has(name)) continue;
    if ((name === 'href' || name === 'src') && !isSafeUrl(value)) continue;

    // Um `style` pode carregar `url(javascript:…)` e, em motores antigos,
    // `expression(…)`. O resto do CSS é inofensivo numa página estática.
    if (name === 'style' && /javascript:|expression\s*\(|@import/i.test(value)) continue;

    kept.push(value === '' ? name : `${name}="${value.replace(/"/g, '&quot;')}"`);
  }

  // Um link que abre noutro separador sem `noopener` dá à página de destino
  // acesso à janela de origem.
  if (tagName === 'a' && kept.some((attr) => attr.startsWith('target='))) {
    if (!kept.some((attr) => attr.startsWith('rel='))) kept.push('rel="noopener noreferrer"');
  }

  const attrs = kept.length > 0 ? ` ${kept.join(' ')}` : '';
  return `<${tagName}${attrs}${selfClosing ? ' /' : ''}>`;
}

export function sanitizeGeneratedHtml(input: string): string {
  let html = input;

  // O pedido diz para não usar cercas de código, mas os modelos põem-nas de
  // vez em quando na mesma. Tirá-las é mais barato do que rejeitar a resposta
  // inteira e voltar a pagar a chamada.
  html = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');

  // Comentários: podem esconder condicionais antigas do Internet Explorer.
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  for (const tag of STRIP_WITH_CONTENT) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    // A mesma etiqueta sem fecho — o que fica a seguir é texto, não código.
    html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '');
  }

  // Etiquetas de fecho: passam se a etiqueta for permitida, senão desaparecem
  // (o conteúdo fica, que é o que se quer para um <font> ou um <center>).
  html = html.replace(/<\/([a-zA-Z][-a-zA-Z0-9]*)\s*>/g, (_whole, name: string) =>
    ALLOWED_TAGS.has(name.toLowerCase()) ? `</${name.toLowerCase()}>` : '',
  );

  // Etiquetas de abertura.
  html = html.replace(
    /<([a-zA-Z][-a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>/g,
    (_whole, name: string, attrs: string, slash: string) => {
      const tag = name.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      return cleanAttributes(tag, attrs, slash === '/');
    },
  );

  return html.trim();
}
