/**
 * As áreas do painel, uma por linha, e é esta a lista que manda.
 *
 * O menu lê-a para saber o que mostrar, a guarda de cada página lê-a para
 * saber quem pode entrar, e o ecrã da equipa lê-a para desenhar as caixas.
 * UMA LISTA SÓ porque as três têm de concordar: uma área que aparecesse no
 * menu mas faltasse na página dava um link que leva a uma porta fechada, e
 * uma que faltasse no ecrã da equipa era uma permissão que ninguém conseguia
 * dar nem tirar — mas que continuava a existir.
 */

export type ChaveDeAcesso =
  | 'pedidos'
  | 'contactar'
  | 'leads'
  | 'funil'
  | 'varrimento'
  | 'paginas'
  | 'modelos'
  | 'robo'
  | 'whatsapp'
  | 'clientes'
  | 'conteudo'
  | 'suporte'
  | 'cobranca'
  | 'marca'
  | 'relatorios';

export interface Area {
  chave: ChaveDeAcesso;
  nome: string;
  /** O que a pessoa passa a poder fazer, na linguagem de quem decide. */
  explica: string;
  /**
   * true quando a área mexe em dinheiro — gasta no Google, ou mostra o que os
   * clientes pagam. Estas aparecem marcadas no ecrã, porque dar acesso a elas
   * sem reparar é a única coisa aqui que custa mesmo alguma coisa.
   */
  dinheiro?: boolean;
}

/** Agrupadas como no menu, para o ecrã da equipa se ler da mesma maneira. */
export const AREAS: { grupo: string; areas: Area[] }[] = [
  {
    grupo: 'Vender',
    areas: [
      {
        chave: 'pedidos',
        nome: 'E-mails recebidos',
        explica: 'Ler e responder a quem escreveu pelo site. Pode marcar como respondido e apagar.',
      },
      {
        chave: 'contactar',
        nome: 'Leads a contactar',
        explica: 'A fila do dia: ligar, mandar mensagem e dizer como correu.',
      },
      {
        chave: 'leads',
        nome: 'Leads em base',
        explica: 'A lista toda, com os filtros, as fichas e as notas.',
      },
      { chave: 'funil', nome: 'Funil', explica: 'Ver em que etapa está cada negociação.' },
      {
        chave: 'varrimento',
        nome: 'Prospetar leads',
        explica: 'Ir buscar leads novos ao Google. Cada varrimento é dinheiro gasto a sério.',
        dinheiro: true,
      },
      {
        chave: 'paginas',
        nome: 'Sites criados',
        explica: 'Ver, editar e publicar os sites de demonstração.',
      },
      {
        chave: 'modelos',
        nome: 'Modelos de site',
        explica: 'Os modelos que se mostram ao cliente.',
      },
      {
        chave: 'marca',
        nome: 'Marca e materiais',
        explica: 'Descarregar o logótipo, o cartão, a apresentação e a proposta.',
      },
    ],
  },
  {
    grupo: 'Canais',
    areas: [
      {
        chave: 'robo',
        nome: 'Conversas do robô',
        explica: 'As conversas automáticas do Instagram e do WhatsApp, e o que o robô respondeu.',
      },
      {
        chave: 'whatsapp',
        nome: 'Instâncias WhatsApp',
        explica: 'Ligar e desligar os números de WhatsApp da agência.',
      },
    ],
  },
  {
    grupo: 'Clientes',
    areas: [
      {
        chave: 'clientes',
        nome: 'Carteira de clientes',
        explica: 'Quem já comprou, o que comprou e o que se lhe pode vender a seguir.',
      },
      {
        chave: 'conteudo',
        nome: 'Calendário de conteúdo',
        explica: 'O calendário de publicações dos clientes: o que sai, quando e em que rede.',
      },
      { chave: 'suporte', nome: 'Suporte', explica: 'O que os clientes pedem depois de comprar.' },
      {
        chave: 'cobranca',
        nome: 'Cobrança',
        explica: 'Ver quanto cada cliente paga à agência e o que está por receber.',
        dinheiro: true,
      },
    ],
  },
  {
    grupo: 'Agência',
    areas: [
      {
        chave: 'relatorios',
        nome: 'Relatórios',
        explica: 'As visitas e os cliques dos sites, mês a mês.',
      },
    ],
  },
];

export const TODAS_AS_AREAS: Area[] = AREAS.flatMap((g) => g.areas);

const CHAVES = new Set<string>(TODAS_AS_AREAS.map((a) => a.chave));

export function ehChaveDeAcesso(valor: string): valor is ChaveDeAcesso {
  return CHAVES.has(valor);
}

/** Fica-se só com o que existe. Uma chave de uma área apagada é ignorada. */
export function limparPermissoes(valores: readonly string[]): ChaveDeAcesso[] {
  return [...new Set(valores)].filter(ehChaveDeAcesso);
}

/**
 * O `*` é o dono.
 *
 * Guardar a lista toda para o dono dava uma conta que perdia acessos sempre
 * que se acrescentasse uma área nova ao painel — e ninguém se ia lembrar de
 * voltar aqui para a somar.
 */
export const TUDO = '*';

export function podeEntrar(permissoes: readonly string[], chave: ChaveDeAcesso): boolean {
  return permissoes.includes(TUDO) || permissoes.includes(chave);
}

export function nomeDaArea(chave: ChaveDeAcesso): string {
  return TODAS_AS_AREAS.find((a) => a.chave === chave)?.nome ?? chave;
}
