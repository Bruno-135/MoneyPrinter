import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { emailsDaPagina, melhorEmail, paginasDeContacto } from './extrair';

/**
 * Ir ao site de um negócio buscar o e-mail que lá está.
 *
 * O endereço do site vem do Google, ou seja, de fora: um `http://localhost`
 * ou um `169.254.169.254` lá posto faria o NOSSO servidor ir ver coisas que só
 * ele alcança. Por isso cada passo — o URL de entrada e cada redirecionamento
 * — passa pela mesma verificação, e só se fala com endereços públicos.
 */

const AGENTE = 'Mozilla/5.0 (compatible; VaiDesignBot/1.0; +https://vaidesign.net)';
const TEMPO_POR_PEDIDO_MS = 5000;
const MAXIMO_DE_BYTES = 1_500_000;
const SALTOS_MAXIMOS = 3;
const PAGINAS_EXTRA = 2;

/** true quando o IP é de uma rede que não é a internet pública. */
export function ipPrivado(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    const mapeado = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return mapeado ? ipPrivado(mapeado[1]!) : false;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n))) return true;
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function destinoPermitido(url: URL): Promise<boolean> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return false;
  }
  if (isIP(host)) return !ipPrivado(host);
  try {
    const achados = await lookup(host, { all: true });
    return achados.length > 0 && achados.every((a) => !ipPrivado(a.address));
  } catch {
    return false;
  }
}

/** O texto da página, a seguir redirecionamentos à mão e a parar nos 1,5 MB. */
async function ler(inicio: URL): Promise<{ html: string; url: URL } | null> {
  let url = inicio;
  for (let salto = 0; salto <= SALTOS_MAXIMOS; salto++) {
    if (!(await destinoPermitido(url))) return null;
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': AGENTE, accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(TEMPO_POR_PEDIDO_MS),
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get('location');
      if (!destino) return null;
      try {
        url = new URL(destino, url);
      } catch {
        return null;
      }
      continue;
    }
    if (!res.ok) return null;
    const tipo = res.headers.get('content-type') ?? '';
    if (tipo && !/html|xml|text/i.test(tipo)) return null;

    try {
      const leitor = res.body?.getReader();
      if (!leitor) return null;
      const pedacos: Uint8Array[] = [];
      let total = 0;
      while (total < MAXIMO_DE_BYTES) {
        const { done, value } = await leitor.read();
        if (done || !value) break;
        pedacos.push(value);
        total += value.byteLength;
      }
      await leitor.cancel().catch(() => undefined);
      return {
        html: new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(pedacos)),
        url,
      };
    } catch {
      return null;
    }
  }
  return null;
}

export interface Achado {
  /** O melhor endereço, ou null se o site não tem nenhum. */
  email: string | null;
  /** false quando o site nem abriu — não se sabe, em vez de «não tem». */
  abriu: boolean;
}

/**
 * Sites que são de uma plataforma e não do negócio: o e-mail que lá estivesse
 * seria do iFood, não da padaria. Ficam marcados como vistos, sem e-mail.
 */
const PLATAFORMAS = [
  'ifood.com.br',
  'wa.link',
  'rappi.com',
  'ubereats.com',
  'tripadvisor.',
  'booking.com',
  'olx.',
  'mercadolivre.',
  'goo.gl',
  'g.page',
  'maps.app.goo.gl',
];

export function ehSiteDePlataforma(site: string): boolean {
  const host = (comEsquema(site)?.hostname ?? '').toLowerCase();
  return PLATAFORMAS.some(
    (p) =>
      host === p ||
      host.endsWith(`.${p}`) ||
      (p.endsWith('.') && host.includes(`.${p}`)) ||
      (p.endsWith('.') && host.startsWith(p)),
  );
}

function comEsquema(site: string): URL | null {
  const limpo = site.trim();
  if (!limpo) return null;
  try {
    return new URL(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
  } catch {
    return null;
  }
}

/**
 * A página inicial, e se não der, até duas páginas de contactos do mesmo
 * site. Pára no primeiro e-mail do domínio do próprio negócio — não se gasta
 * tempo a procurar o melhor quando já se achou o certo.
 */
export async function emailDoSite(site: string): Promise<Achado> {
  const entrada = comEsquema(site);
  if (!entrada || ehSiteDePlataforma(site)) return { email: null, abriu: false };

  const inicial = await ler(entrada);
  if (!inicial) return { email: null, abriu: false };

  const host = inicial.url.hostname;
  const raiz = host.replace(/^www\./, '');
  const achados = emailsDaPagina(inicial.html);

  const doDominio = () => achados.some((e) => e.split('@')[1]!.endsWith(raiz));

  if (!doDominio()) {
    for (const pagina of paginasDeContacto(inicial.html, inicial.url).slice(0, PAGINAS_EXTRA)) {
      const lida = await ler(pagina);
      if (lida) achados.push(...emailsDaPagina(lida.html));
      if (doDominio()) break;
    }
  }

  return { email: melhorEmail([...new Set(achados)], host), abriu: true };
}
