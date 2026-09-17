/**
 * O menu lateral e os títulos de cada ecrã.
 *
 * Os quinze ecrãs do desenho estão todos cá, incluindo os que ainda não estão
 * ligados a nada. Esses trazem uma tira a dizê-lo por dentro: assim vê-se o
 * caminho todo e discute-se o desenho, sem que se tome por verdade um número de
 * exemplo. Um ecrã com dados inventados e SEM aviso é que seria um problema.
 */

export interface ItemDeMenu {
  href: string;
  label: string;
  /** true quando o ecrã ainda não lê dados nenhuns. Marca-se no menu. */
  porLigar?: boolean;
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
      { href: '/painel/comercios', label: 'Comércios' },
      { href: '/painel/funil', label: 'Funil' },
      { href: '/painel/varrimento', label: 'Varrimento e custos' },
      { href: '/painel/paginas', label: 'Landing pages' },
      { href: '/painel/modelos', label: 'Modelos de site' },
    ],
  },
  {
    grupo: 'Canais',
    itens: [
      { href: '/painel/robo', label: 'Conversas do robô', porLigar: true },
      { href: '/painel/whatsapp', label: 'Instâncias WhatsApp', porLigar: true },
    ],
  },
  {
    grupo: 'Clientes',
    itens: [
      { href: '/painel/clientes', label: 'Carteira de clientes' },
      { href: '/painel/conteudo', label: 'Calendário de conteúdo', porLigar: true },
      { href: '/painel/suporte', label: 'Suporte' },
      { href: '/painel/cobranca', label: 'Cobrança' },
    ],
  },
  {
    grupo: 'Agência',
    itens: [
      { href: '/painel/relatorios', label: 'Relatórios' },
      { href: '/painel/equipa', label: 'Equipa e permissões', porLigar: true },
      { href: '/painel/perfil', label: 'Perfil e progresso' },
    ],
  },
];

/** Título e subtítulo do cabeçalho, por caminho. */
const TITULOS: Record<string, [string, string]> = {
  '/painel': ['Painel de hoje', 'a quem ligar agora'],
  '/painel/contactar': ['Fila de contacto', 'um de cada vez, atrasados primeiro'],
  '/painel/comercios': ['Comércios em base', 'tudo o que já se encontrou'],
  '/painel/funil': ['Funil de vendas', '8 etapas'],
  '/painel/varrimento': ['Varrimento e custos', 'Google Places · dinheiro real'],
  '/painel/paginas': ['Landing pages', 'geradas, no ar e vendidas'],
  '/painel/modelos': ['Modelos de site', 'o que se mostra antes de dizer o preço'],
  '/painel/robo': ['Conversas do robô', 'Instagram → WhatsApp'],
  '/painel/whatsapp': ['Instâncias WhatsApp', 'oficiais e não oficiais'],
  '/painel/clientes': ['Carteira de clientes', 'quem já comprou, e o quê'],
  '/painel/conteudo': ['Calendário de conteúdo', 'serviços recorrentes'],
  '/painel/suporte': ['Caixa de entrada do suporte', 'o que os clientes pedem'],
  '/painel/cobranca': ['Cobrança das mensalidades', 'o que os clientes pagam à agência'],
  '/painel/relatorios': ['Relatórios', 'visitas e cliques por mês'],
  '/painel/equipa': ['Equipa e permissões', 'quem pode fazer o quê'],
  '/painel/perfil': ['Perfil e progresso', 'contra o teu próprio histórico'],
  '/painel/procurar': ['Procurar', 'nome, telefone ou referência'],
};

export function tituloDoEcra(caminho: string): [string, string] {
  if (TITULOS[caminho]) return TITULOS[caminho];
  if (caminho.startsWith('/painel/comercio/')) {
    return ['Ficha do comércio', 'tudo o que decide a chamada'];
  }
  if (caminho.startsWith('/painel/modelos/')) return ['Modelo de site', 'como o comerciante o vai ver'];
  if (caminho.startsWith('/painel/site/')) return ['Landing page', 'a página de demonstração'];
  return ['Painel', ''];
}

/**
 * true quando este item do menu é o ecrã em que estamos.
 *
 * `/painel` é caso à parte: é prefixo de todos os outros, e sem esta excepção
 * ficava aceso em todos os ecrãs ao mesmo tempo.
 */
export function estaAceso(item: ItemDeMenu, caminho: string): boolean {
  if (caminho === item.href) return true;
  if (item.href === '/painel') return false;
  // A ficha de um comércio acende "Comércios", que é de onde se lá chega.
  if (item.href === '/painel/comercios' && caminho.startsWith('/painel/comercio/')) return true;
  return caminho.startsWith(`${item.href}/`);
}
