/**
 * Tirar o e-mail de contacto do HTML de um site.
 *
 * Só devolve endereços que a empresa PÔS no site para lhe escreverem — é o
 * que torna a recolha defensável: não se adivinha `info@` nem se compra lista.
 *
 * O difícil não é encontrar `@`, é não apanhar lixo: um site Wix está cheio de
 * `…@sentry.io`, um tema WordPress traz `user@example.com`, e o nome de uma
 * imagem `logo@2x.png` parece um endereço. Cada filtro abaixo existe por um
 * destes casos.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

const FICHEIROS = /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|woff2?|ttf|eot|mp4|pdf)$/i;

/** Domínios que aparecem no código das páginas e nunca são do negócio. */
const DOMINIOS_DE_RUIDO = new Set([
  'example.com',
  'example.org',
  'exemplo.com',
  'email.com',
  'domain.com',
  'dominio.com',
  'yourdomain.com',
  'seudominio.com',
  'sentry.io',
  'sentry.wixpress.com',
  'wixpress.com',
  'wix.com',
  'godaddy.com',
  'squarespace.com',
  'shopify.com',
  'wordpress.com',
  'wordpress.org',
  'w3.org',
  'schema.org',
  'google.com',
  'gstatic.com',
  'cloudflare.com',
]);

/** Partes locais que ninguém lê: respostas automáticas e exemplos. */
const PARTES_DE_RUIDO = new Set([
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
  'webmaster',
  'abuse',
  'user',
  'name',
  'email',
  'nome',
  'seuemail',
  'youremail',
  'teste',
  'test',
]);

/**
 * Ofuscações que as pessoas usam contra robôs e que o navegador mostra como
 * e-mail normal: `geral [at] loja [dot] pt`, `geral(arroba)loja.pt`, `&#64;`.
 */
function desofuscar(texto: string): string {
  return texto
    .replace(/&#0*64;|&#x0*40;|&commat;/gi, '@')
    .replace(/%40/g, '@')
    .replace(/\s*[[({]\s*(?:at|arroba)\s*[\])}]\s*/gi, '@')
    .replace(/\s*[[({]\s*(?:dot|ponto)\s*[\])}]\s*/gi, '.');
}

/** Tira o HTML à volta; o que interessa é o texto e os `mailto:`. */
function semMarcas(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function ehEmailDeNegocio(email: string): boolean {
  const limpo = email.trim().toLowerCase();
  const [parte, dominio, ...resto] = limpo.split('@');
  if (!parte || !dominio || resto.length > 0) return false;
  if (FICHEIROS.test(limpo)) return false;
  // `logo@2x.png` já cai acima; isto apanha `sprite@2x`, `icon@3x`.
  if (/^[^@]*@\d+x\b/.test(limpo)) return false;
  if (DOMINIOS_DE_RUIDO.has(dominio)) return false;
  if (PARTES_DE_RUIDO.has(parte)) return false;
  // Identificadores de 32 hexadecimais: são ids de rastreio, não pessoas.
  if (/^[a-f0-9]{24,}$/.test(parte)) return false;
  return true;
}

/**
 * Todos os e-mails de negócio de uma página, sem repetidos, pela ordem em
 * que aparecem. Os `mailto:` vêm primeiro: é a empresa a dizer «escreve para
 * aqui», e é mais fiável do que um endereço solto no texto.
 */
export function emailsDaPagina(html: string): string[] {
  const vistos = new Set<string>();
  const lista: string[] = [];

  const juntar = (candidato: string) => {
    const email = candidato
      .trim()
      .toLowerCase()
      .replace(/^[.\-_]+|[.\-_]+$/g, '');
    if (!ehEmailDeNegocio(email) || vistos.has(email)) return;
    vistos.add(email);
    lista.push(email);
  };

  const claro = desofuscar(html);

  for (const m of claro.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    let alvo = m[1]!;
    try {
      alvo = decodeURIComponent(alvo.replace(/\+/g, ' '));
    } catch {
      // `%` solto: fica como está e o filtro decide.
    }
    for (const parte of alvo.split(/[,;]/)) {
      const achado = parte.match(EMAIL);
      if (achado) juntar(achado[0]);
    }
  }
  for (const m of semMarcas(claro).matchAll(EMAIL)) juntar(m[0]);

  return lista;
}

/** Partes locais que costumam ser a caixa que alguém lê de facto. */
const CAIXAS_GERAIS = [
  'geral',
  'info',
  'contacto',
  'contato',
  'contactos',
  'comercial',
  'atendimento',
  'vendas',
  'reservas',
  'loja',
  'hello',
  'ola',
  'mail',
  'admin',
];

/**
 * O melhor de vários. Do mesmo domínio do site primeiro (é o da empresa), e
 * entre esses uma caixa geral; um gmail/hotmail serve, mas só se não houver
 * melhor — é o que muita gente pequena usa e é perfeitamente válido.
 */
export function melhorEmail(emails: readonly string[], hostDoSite: string | null): string | null {
  if (emails.length === 0) return null;
  const raiz = (hostDoSite ?? '').replace(/^www\./, '').toLowerCase();

  const nota = (email: string): number => {
    const [parte, dominio] = email.split('@') as [string, string];
    let n = 0;
    if (raiz && (dominio === raiz || dominio.endsWith(`.${raiz}`) || raiz.endsWith(`.${dominio}`)))
      n += 10;
    const idx = CAIXAS_GERAIS.indexOf(parte);
    if (idx !== -1) n += 5 - Math.min(idx, 4) * 0.1;
    return n;
  };

  return [...emails].sort((a, b) => nota(b) - nota(a))[0] ?? null;
}

/**
 * Ligações do mesmo site que costumam ter o e-mail: contactos, sobre nós.
 * Devolve URLs absolutos e só do mesmo domínio — nunca se sai do site.
 */
export function paginasDeContacto(html: string, base: URL): URL[] {
  const achadas: URL[] = [];
  const vistos = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    const href = m[1]!.trim();
    if (/^(mailto|tel|javascript|whatsapp):/i.test(href)) continue;
    if (!/contact|contato|sobre|about|quem-somos|fale|empresa|info/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    if (url.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
    if (FICHEIROS.test(url.pathname)) continue;
    url.hash = '';
    if (vistos.has(url.href) || url.href === base.href) continue;
    vistos.add(url.href);
    achadas.push(url);
  }
  return achadas;
}
