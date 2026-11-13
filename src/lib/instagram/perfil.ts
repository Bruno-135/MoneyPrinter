/**
 * O perfil de Instagram de um lead, a partir do endereço que veio do Google.
 *
 * Quem pôs o Instagram no lugar do site fica com ele em `social_links.instagram`
 * (ver `places/website.ts`). Daqui sai o nome de utilizador, que é o que abre a
 * conversa direta.
 */

/** Caminhos do Instagram que não são perfis: uma publicação, um reel, a página de entrada. */
const NAO_SAO_PERFIS = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'accounts',
  'direct',
  'about',
  'developer',
  'legal',
  'web',
]);

/** O nome de utilizador, sem `@`, em minúsculas; null quando o endereço não é de um perfil. */
export function utilizadorDoInstagram(endereco: string | null | undefined): string | null {
  if (!endereco) return null;
  let url: URL;
  try {
    url = new URL(
      /^https?:\/\//i.test(endereco.trim()) ? endereco.trim() : `https://${endereco.trim()}`,
    );
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  if (host !== 'instagram.com' && host !== 'instagr.am') return null;

  const primeiro = url.pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '') ?? '';
  if (!/^[A-Za-z0-9._]{1,30}$/.test(primeiro)) return null;
  if (NAO_SAO_PERFIS.has(primeiro.toLowerCase())) return null;
  return primeiro.toLowerCase();
}

/** A conversa direta com o perfil. O Instagram não aceita texto no endereço, ao contrário do wa.me. */
export function ligacaoDoDirect(utilizador: string): string {
  return `https://ig.me/m/${utilizador}`;
}

export function ligacaoDoPerfil(utilizador: string): string {
  return `https://www.instagram.com/${utilizador}/`;
}
