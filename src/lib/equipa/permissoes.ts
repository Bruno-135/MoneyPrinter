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
  | 'emails'
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
        nome: 'Lista de WhatsApp',
        explica:
          'Ver os leads com telemóvel, filtrar por país, ramo e score, e abrir a conversa no WhatsApp.',
      },
      {
        chave: 'emails',
        nome: 'E-mails dos leads',
        explica: 'Extrair os e-mails dos sites dos leads e ver a folha com o estado de cada um.',
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

/**
 * Os papéis: uma etiqueta e um atalho.
 *
 * O PAPEL NÃO DECIDE NADA. Quem decide os acessos é sempre a lista de
 * permissões; isto só diz que caixas marcar quando se escolhe, e que palavra
 * mostrar ao lado do nome. Se o papel também mandasse, havia duas respostas
 * para «o que é que esta pessoa pode fazer?» — e um dia discordavam.
 *
 * Nenhum traz as áreas de dinheiro — prospetar e cobrança — nem os e-mails dos
 * leads, que mandam o servidor abrir sites de terceiros. Essas dão-se à mão,
 * uma pessoa de cada vez, porque são as únicas que custam ou expõem dinheiro.
 */

export interface Papel {
  chave: string;
  nome: string;
  explica: string;
  /** As caixas que este papel propõe. */
  permissoes: ChaveDeAcesso[];
}

export const PAPEIS: Papel[] = [
  {
    chave: 'comercial',
    nome: 'Comercial',
    explica: 'Contacta, negoceia e fecha. Vê os leads e os sites que lhes mostra.',
    permissoes: ['pedidos', 'contactar', 'leads', 'funil', 'paginas', 'modelos', 'marca'],
  },
  {
    chave: 'operacional',
    nome: 'Operacional',
    explica: 'Faz e publica os sites, e trata do conteúdo dos clientes.',
    permissoes: ['leads', 'paginas', 'modelos', 'marca', 'conteudo'],
  },
  {
    chave: 'suporte',
    nome: 'Suporte',
    explica: 'Atende quem já é cliente e responde a quem escreve pelo site.',
    permissoes: ['pedidos', 'suporte', 'clientes', 'conteudo', 'marca'],
  },
  {
    chave: 'personalizado',
    nome: 'Personalizado',
    explica: 'Marcas tu as caixas, uma a uma.',
    permissoes: [],
  },
];

export const PAPEL_POR_OMISSAO = 'personalizado';

export function papelPorChave(chave: string): Papel {
  return PAPEIS.find((p) => p.chave === chave) ?? PAPEIS[PAPEIS.length - 1]!;
}

export function nomeDoPapel(chave: string): string {
  return papelPorChave(chave).nome;
}

/**
 * Que papel corresponde a estas permissões, se algum.
 *
 * Serve para a lista mostrar «Comercial» em vez de «Personalizado» a quem
 * tem exactamente as caixas de comercial, mesmo que tenham sido marcadas à
 * mão — e para a etiqueta deixar de mentir quando alguém mexe nas caixas
 * depois de escolher o papel.
 */
export function papelDestasPermissoes(permissoes: readonly string[]): string {
  const tem = new Set(permissoes);
  const encontrado = PAPEIS.find(
    (p) =>
      p.chave !== PAPEL_POR_OMISSAO &&
      p.permissoes.length === tem.size &&
      p.permissoes.every((c) => tem.has(c)),
  );
  return encontrado?.chave ?? PAPEL_POR_OMISSAO;
}
