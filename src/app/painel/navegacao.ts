/**
 * O menu lateral e os títulos de cada ecrã.
 *
 * Os quinze ecrãs do desenho estão todos cá, incluindo os que ainda não estão
 * ligados a nada. Esses trazem uma tira a dizê-lo por dentro: assim vê-se o
 * caminho todo e discute-se o desenho, sem que se tome por verdade um número de
 * exemplo. Um ecrã com dados inventados e SEM aviso é que seria um problema.
 */

import { podeEntrar, type ChaveDeAcesso } from '@/lib/equipa/permissoes';

/**
 * Quem chega a esta entrada: uma área de acesso, só o dono, ou toda a gente
 * com sessão. OBRIGATÓRIO de propósito — uma entrada nova sem isto não
 * compila, e assim não há maneira de acrescentar uma página ao menu e
 * esquecer quem a pode ver.
 */
export type QuemVe = ChaveDeAcesso | 'dono' | 'todos';

export interface ItemDeMenu {
  href: string;
  label: string;
  acesso: QuemVe;
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
      { href: '/painel', label: 'Painel', acesso: 'todos' },
      { href: '/painel/pedidos', label: 'E-mails recebidos', acesso: 'pedidos' },
      { href: '/painel/contactar', label: 'Leads a contactar', acesso: 'contactar' },
      { href: '/painel/comercios', label: 'Leads', acesso: 'leads' },
      { href: '/painel/funil', label: 'Funil', acesso: 'funil' },
      { href: '/painel/varrimento', label: 'Prospetar leads', acesso: 'varrimento' },
      { href: '/painel/paginas', label: 'Sites criados', acesso: 'paginas' },
      { href: '/painel/modelos', label: 'Modelos de site', acesso: 'modelos' },
    ],
  },
  {
    grupo: 'Canais',
    itens: [
      { href: '/painel/robo', label: 'Conversas do robô', acesso: 'robo', porLigar: true },
      {
        href: '/painel/whatsapp',
        label: 'Instâncias WhatsApp',
        acesso: 'whatsapp',
        porLigar: true,
      },
    ],
  },
  {
    grupo: 'Clientes',
    itens: [
      { href: '/painel/clientes', label: 'Carteira de clientes', acesso: 'clientes' },
      {
        href: '/painel/conteudo',
        label: 'Calendário de conteúdo',
        acesso: 'conteudo',
        porLigar: true,
      },
      { href: '/painel/suporte', label: 'Suporte', acesso: 'suporte' },
      { href: '/painel/cobranca', label: 'Cobrança', acesso: 'cobranca' },
    ],
  },
  {
    grupo: 'Agência',
    itens: [
      // A sala da marca é da agência e não de uma venda: o cartão, a
      // apresentação e o manual são nossos, e não mudam de cliente para
      // cliente. Esteve em «Vender» por se procurar no momento de mandar uma
      // coisa a alguém; está aqui porque é aqui que se vai procurá-la.
      { href: '/painel/marca', label: 'Marca e materiais', acesso: 'marca' },
      { href: '/painel/relatorios', label: 'Relatórios', acesso: 'relatorios' },
      { href: '/painel/equipa', label: 'Equipa e permissões', acesso: 'dono' },
      { href: '/painel/perfil', label: 'Perfil e progresso', acesso: 'todos' },
    ],
  },
];

/** Título e subtítulo do cabeçalho, por caminho. */
const TITULOS: Record<string, [string, string]> = {
  '/painel': ['Painel de hoje', 'a quem ligar agora'],
  '/painel/pedidos': ['E-mails recebidos', 'quem nos escreveu pelo site'],
  '/painel/contactar': ['Leads a contactar', 'um de cada vez, atrasados primeiro'],
  '/painel/comercios': ['Leads em base', 'tudo o que já se encontrou'],
  '/painel/marca': ['Marca e materiais', 'o que se manda a um cliente'],
  '/painel/funil': ['Funil de vendas', '8 etapas'],
  '/painel/varrimento': ['Prospetar leads', 'Google Places · dinheiro real'],
  '/painel/paginas': ['Sites criados', 'gerados, no ar e vendidos'],
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
    return ['Ficha do lead', 'tudo o que decide a chamada'];
  }
  if (caminho.startsWith('/painel/modelos/'))
    return ['Modelo de site', 'como o comerciante o vai ver'];
  if (caminho.endsWith('/pecas') && caminho.startsWith('/painel/site/')) {
    return ['Peças da loja', 'o que aparece na montra'];
  }
  if (caminho.endsWith('/paginas') && caminho.startsWith('/painel/site/')) {
    return ['Páginas do site', 'o menu e o que está em cada uma'];
  }
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

/**
 * O menu de quem está a ver.
 *
 * Esconder o que a pessoa não pode abrir não é segurança — a segurança está na
 * guarda de cada página e nas políticas da base. É para não haver links que
 * levam a portas fechadas, que é a maneira mais rápida de alguém pensar que o
 * painel está avariado.
 */
export function menuPara(permissoes: readonly string[], ehDono: boolean): readonly SeccaoDeMenu[] {
  const ve = (item: ItemDeMenu) =>
    item.acesso === 'todos' ||
    (item.acesso === 'dono' ? ehDono : podeEntrar(permissoes, item.acesso));

  return MENU.map((seccao) => ({ ...seccao, itens: seccao.itens.filter(ve) })).filter(
    (seccao) => seccao.itens.length > 0,
  );
}
