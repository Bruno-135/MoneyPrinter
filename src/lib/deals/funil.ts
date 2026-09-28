import { STAGES, type DealStage } from './stages';

/**
 * As medidas e as palavras do funil, tal como no desenho.
 *
 * Isto não desenha nada: conta, divide e devolve larguras. Fica fora do
 * componente de propósito — assim as contas testam-se sem abrir um browser,
 * que é onde os erros de percentagem costumam passar despercebidos.
 *
 * A FÓRMULA É A DO DESENHO, À VÍRGULA, incluindo a raiz quadrada e os dois
 * limites. Não é a que eu tinha escrito antes. Copiada e não adaptada porque
 * a forma do funil é uma decisão de desenho: mudá-la «para ficar melhor»
 * dava um funil que já não era aquele, e era eu a decidir sozinho uma coisa
 * que já estava decidida.
 *
 * A largura de cada etapa acompanha o número de contactos que lá estão, mas
 * pela RAIZ QUADRADA e com um mínimo de 46%. Em linha recta, com 5000 numa
 * etapa e 6 noutra, as de baixo desapareciam; assim continuam a ver-se e a
 * poder carregar-se nelas, e a diferença lê-se na mesma.
 */

/** A rampa do desenho: do bege ao laranja da marca. */
export const CORES = ['#DDD2C0', '#E7B892', '#EA9A63', '#EB7A3A', '#EC5B13'] as const;

/** As larguras dos dois ecrãs do desenho, em pixéis. */
export const LARGURA_PC = 640;
export const LARGURA_TEL = 350;

/**
 * As descrições do desenho.
 *
 * São outras que as de `stages.ts` — mais compridas, escritas para se lerem
 * ao lado do cone. As de `stages.ts` continuam a servir as listas e os
 * filtros, onde o espaço é outro.
 */
const DESCRICAO: Record<string, string> = {
  new: 'Entrada do funil. Ainda não receberam mensagem.',
  contacted: 'Primeira mensagem enviada, à espera de resposta.',
  meeting_scheduled: 'Conversa ou chamada combinada.',
  proposal_sent: 'Proposta por escrito entregue ao cliente.',
  negotiating: 'A acertar preço, prazo ou o que entra.',
  won: 'Fechou negócio. Sai do funil de trabalho.',
  lost: 'Não avançou. Pode reabrir se mudar de ideias.',
  on_hold: 'Adiado por decisão do cliente.',
};

export interface Medida {
  /** Largura do trapézio em pixéis, como o desenho a calcula. */
  largura: number;
  /**
   * A mesma largura em percentagem da caixa.
   *
   * O desenho trabalha numa prancheta de 1440 e pode dizer «412px». O painel
   * tem barra lateral e muda de largura, por isso o que vai para o ecrã é a
   * percentagem: a FORMA é a mesma, encolhe toda junta em vez de rebentar a
   * coluna do lado.
   */
  larguraPct: string;
  /** O recorte que lhe dá a forma, já pronto para o `style`. */
  clip: string;
}

export interface BandaDoFunil {
  value: DealStage;
  titulo: string;
  descricao: string;
  /** «01» a «05», como no desenho. */
  num: string;
  cor: string;
  quantos: number;
  /** «entrada do funil», «53% da anterior» ou «— da anterior». */
  taxa: string;
  pc: Medida;
  tel: Medida;
}

export interface SaidaDoFunil {
  value: DealStage;
  /** «06 · GANHO». */
  etiqueta: string;
  descricao: string;
  quantos: number;
  fundo: string;
  tinta: string;
  risco: string;
  tintaFraca: string;
}

export interface Funil {
  bandas: BandaDoFunil[];
  saidas: SaidaDoFunil[];
  /** Soma das cinco etapas em jogo. */
  emJogo: number;
  /** Tudo, incluindo ganho, perdido e em pausa. */
  total: number;
  vazio: boolean;
}

/** As cores de cada saída, tal como no desenho. */
const ESTILO_DA_SAIDA: Record<string, Omit<SaidaDoFunil, 'value' | 'quantos' | 'descricao'>> = {
  won: {
    etiqueta: '06 · GANHO',
    fundo: '#EC5B13',
    tinta: '#141210',
    risco: '#EC5B13',
    tintaFraca: '#141210',
  },
  lost: {
    etiqueta: '07 · PERDIDO',
    fundo: '#141210',
    tinta: '#F6EFE4',
    risco: '#141210',
    tintaFraca: '#BDB3A6',
  },
  on_hold: {
    etiqueta: '08 · EM PAUSA',
    fundo: '#FFFBF5',
    tinta: '#141210',
    risco: '#DDD2C0',
    tintaFraca: '#5A5249',
  },
};

/**
 * Os trapézios, para uma largura de caixa.
 *
 * A base de cada um nunca passa do próprio topo: um funil ao contrário — mais
 * em negociação do que por contactar, e acontece — desce a direito em vez de
 * abrir para fora. E nunca aperta abaixo de 60% do topo, senão cada trapézio
 * virava um bico e o conjunto deixava de se ler como um funil.
 */
function medidas(numeros: number[], caixa: number): Medida[] {
  const maior = Math.max(...numeros, 1);
  const fraccao = (v: number) => 0.46 + 0.54 * Math.sqrt(v / maior);
  const topos = numeros.map((v) => Math.round(caixa * fraccao(v)));

  return topos.map((topo, i) => {
    const base = Math.max(
      Math.round(topo * 0.6),
      i < topos.length - 1 ? Math.min(topos[i + 1]!, topo) : Math.round(topo * 0.82),
    );
    const recuo = Math.max(0, (topo - base) / 2);
    // O recuo em percentagem da própria banda, não da caixa: assim o trapézio
    // guarda os seus ângulos seja qual for a largura do ecrã.
    const r = topo > 0 ? (recuo / topo) * 100 : 0;
    return {
      largura: topo,
      larguraPct: (topo / caixa) * 100 + '%',
      clip: `polygon(0 0,100% 0,${100 - r}% 100%,${r}% 100%)`,
    };
  });
}

export function montarFunil(contagens: ReadonlyMap<string, number>): Funil {
  const abertas = STAGES.filter((s) => s.open);
  const fechadas = STAGES.filter((s) => !s.open);
  const quantos = (valor: string) => contagens.get(valor) ?? 0;

  const numeros = abertas.map((s) => quantos(s.value));
  const pc = medidas(numeros, LARGURA_PC);
  const tel = medidas(numeros, LARGURA_TEL);

  const bandas: BandaDoFunil[] = abertas.map((s, i) => ({
    value: s.value,
    titulo: s.label,
    descricao: DESCRICAO[s.value] ?? s.hint,
    num: '0' + (i + 1),
    cor: CORES[i] ?? CORES[CORES.length - 1]!,
    quantos: numeros[i]!,
    // «X% da anterior» e não «passaram X%»: isto é uma fotografia de agora,
    // não um caudal, e com mais nesta etapa do que na anterior dava números
    // como «passaram 800%».
    taxa:
      i === 0
        ? 'entrada do funil'
        : numeros[i - 1]
          ? Math.round((numeros[i]! / numeros[i - 1]!) * 100) + '% da anterior'
          : '— da anterior',
    pc: pc[i]!,
    tel: tel[i]!,
  }));

  const saidas: SaidaDoFunil[] = fechadas.map((s) => ({
    value: s.value,
    descricao: DESCRICAO[s.value] ?? s.hint,
    quantos: quantos(s.value),
    ...ESTILO_DA_SAIDA[s.value]!,
  }));

  const emJogo = numeros.reduce((a, b) => a + b, 0);
  const total = emJogo + saidas.reduce((a, s) => a + s.quantos, 0);

  return { bandas, saidas, emJogo, total, vazio: total === 0 };
}

export type { DealStage };
