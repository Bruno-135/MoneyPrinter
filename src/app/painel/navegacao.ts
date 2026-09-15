/**
 * O menu lateral e os títulos de cada ecrã.
 *
 * Só entram aqui páginas que existem mesmo. O desenho previa quinze ecrãs, mas
 * um item de menu que abre uma página vazia é pior do que não ter o item: faz
 * perder tempo a confirmar que ainda não está feito.
 */

export interface ItemDeMenu {
  href: string;
  label: string;
  /** Casa também com as sub-páginas, para o item ficar aceso lá dentro. */
  prefixo?: string;
}

export interface SeccaoDeMenu {
  grupo: string;
  itens: ItemDeMenu[];
}

export const MENU: readonly SeccaoDeMenu[] = [
  {
    grupo: 'Vender',
    itens: [
      { href: '/painel', label: 'Painel' },
      { href: '/painel/contactar', label: 'Fila de contacto' },
    ],
  },
  {
    grupo: 'Clientes',
    itens: [{ href: '/painel/clientes', label: 'Carteira de clientes' }],
  },
  {
    grupo: 'Agência',
    itens: [{ href: '/painel/relatorios', label: 'Relatórios' }],
  },
];

/** Título e subtítulo do cabeçalho, por caminho. */
const TITULOS: Record<string, [string, string]> = {
  '/painel': ['Painel de hoje', 'a quem ligar agora'],
  '/painel/contactar': ['Fila de contacto', 'um de cada vez, atrasados primeiro'],
  '/painel/clientes': ['Carteira de clientes', 'quem já comprou, e o quê'],
  '/painel/relatorios': ['Relatórios', 'visitas e cliques por mês'],
};

export function tituloDoEcra(caminho: string): [string, string] {
  if (TITULOS[caminho]) return TITULOS[caminho];
  if (caminho.startsWith('/painel/comercio/')) {
    return ['Ficha do comércio', 'tudo o que decide a chamada'];
  }
  if (caminho.startsWith('/painel/site/')) return ['Landing page', 'a página de demonstração'];
  return ['Painel', ''];
}

/** true quando este item do menu é o ecrã em que estamos. */
export function estaAceso(item: ItemDeMenu, caminho: string): boolean {
  if (caminho === item.href) return true;
  const prefixo = item.prefixo ?? (item.href === '/painel' ? null : item.href);
  return prefixo !== null && caminho.startsWith(`${prefixo}/`);
}
