/**
 * Classificação da presença digital de um comércio.
 *
 * Três casos, e a distinção é o coração do produto:
 *
 *   none         nada no campo do site
 *   social_only  a página de Facebook/Instagram, um Linktree, ou um site-montra
 *                gratuito (business.site da Google, Wix, Blogspot)
 *   real         tem mesmo um site
 *
 * Os dois primeiros são prospetos. Quem pôs o Facebook no campo do site é, na
 * verdade, o melhor prospeto que existe: já percebeu que precisa de presença
 * online e já teve o trabalho de a montar em cima de uma plataforma alheia.
 *
 * A mesma regra está codificada na base de dados, como coluna gerada
 * (migração 0010). Esta versão em TypeScript existe para a aplicação poder
 * classificar antes de gravar e para os testes correrem sem base de dados.
 * As duas TÊM DE ANDAR A PAR — se mexeres numa, mexe na outra.
 */

export type WebsiteKind = 'none' | 'social_only' | 'real';

/** Domínios que não contam como site próprio. */
const SOCIAL_HOSTS = new Set([
  'facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
  'instagram.com', 'tiktok.com',
  'linktr.ee', 'linktree.com', 'beacons.ai', 'bio.link',
  'wa.me', 'api.whatsapp.com', 'chat.whatsapp.com',
  'twitter.com', 'x.com', 'youtube.com', 'youtu.be',
  'linkedin.com', 'pinterest.com', 'pinterest.pt', 'pinterest.com.br',
  'bit.ly', 'business.site', 'negocio.site',
  'sites.google.com', 'wixsite.com', 'blogspot.com', 'blogspot.pt', 'blogspot.com.br',
]);

/** Sufixos de plataformas de site-montra gratuito. */
const SOCIAL_SUFFIXES = ['.business.site', '.negocio.site', '.wixsite.com', '.blogspot.com'];

/** Redes sociais reconhecidas, para preencher `social_links`. */
const SOCIAL_NETWORKS: ReadonlyArray<{ key: string; hosts: string[] }> = [
  { key: 'facebook', hosts: ['facebook.com', 'm.facebook.com', 'fb.com', 'fb.me'] },
  { key: 'instagram', hosts: ['instagram.com'] },
  { key: 'tiktok', hosts: ['tiktok.com'] },
  { key: 'youtube', hosts: ['youtube.com', 'youtu.be'] },
  { key: 'linkedin', hosts: ['linkedin.com'] },
  { key: 'whatsapp', hosts: ['wa.me', 'api.whatsapp.com', 'chat.whatsapp.com'] },
  { key: 'linktree', hosts: ['linktr.ee', 'linktree.com'] },
];

/**
 * Extrai o domínio de um URL, tolerando o que a vida real traz: sem esquema,
 * com `www.`, com caminho, com parâmetros.
 */
export function websiteHost(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === '') return null;

  const match = /^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/i.exec(trimmed);
  const host = match?.[1]?.toLowerCase();
  return host && host !== '' ? host : null;
}

export function classifyWebsite(url: string | null | undefined): WebsiteKind {
  const host = websiteHost(url);
  if (host === null) return 'none';

  if (SOCIAL_HOSTS.has(host)) return 'social_only';
  if (SOCIAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return 'social_only';

  return 'real';
}

/**
 * Quando o campo do site aponta para uma rede social, essa ligação é
 * informação útil sobre o comércio e vai para `social_links`.
 */
export function socialLinksFrom(url: string | null | undefined): Record<string, string> {
  const host = websiteHost(url);
  if (host === null || !url) return {};

  const network = SOCIAL_NETWORKS.find(
    (n) => n.hosts.includes(host) || n.hosts.some((h) => host.endsWith(`.${h}`)),
  );

  return network ? { [network.key]: url.trim() } : {};
}

/** true para os comércios que interessa abordar. */
export function isProspect(kind: WebsiteKind): boolean {
  return kind !== 'real';
}
