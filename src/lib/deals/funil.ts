import { STAGES, type DealStage, type StageDefinition } from './stages';

/**
 * As medidas do desenho do funil.
 *
 * Isto não desenha nada: conta, divide e devolve larguras. Fica fora do
 * componente de propósito — assim as contas do funil testam-se sem abrir um
 * browser, que é onde os erros de percentagem costumam passar despercebidos.
 *
 * A LARGURA DE CADA ETAPA É O NÚMERO DE LEADS, e não uma forma bonita fixa.
 * Um funil desenhado sempre igual é um desenho, não um gráfico: parece que
 * está tudo bem mesmo quando há 400 por contactar e 1 em negociação. Aqui a
 * forma diz a verdade, e quando o funil está entupido a meio vê-se logo que
 * está — que é o único motivo para ter um funil na parede.
 */

/** A largura mais estreita que uma etapa pode ter, em fração do total. */
const MINIMO = 0.17;

/** A forma quando ainda não há leads nenhuns: um funil vazio, só para ver. */
const VAZIO = [1, 0.84, 0.68, 0.52, 0.36];

/** Quanto o bico aperta abaixo da última etapa aberta. */
const BICO = 0.62;

export interface BandaDoFunil extends StageDefinition {
  quantos: number;
  /** Largura no topo da banda, de 0 a 1. É o número de leads. */
  larguraTopo: number;
  /** Largura em baixo: a da etapa seguinte, para as bandas encaixarem. */
  larguraBase: number;
  /** Fração do total de leads, de 0 a 1. */
  parteDoTotal: number;
  /**
   * Fração dos que estavam na etapa anterior e chegaram a esta, de 0 a 1.
   * `null` na primeira etapa e quando a anterior está a zero — dividir por
   * zero dava «Infinity%», e ninguém quer ver isso num painel.
   */
  passouDaAnterior: number | null;
}

export interface Funil {
  /** As etapas em jogo, do topo para o bico. */
  bandas: BandaDoFunil[];
  /** Ganho, perdido e em pausa: saem do funil, não avançam nele. */
  desfechos: (StageDefinition & { quantos: number })[];
  /** Total de leads, incluindo os desfechos. */
  total: number;
  /** Total só das etapas em jogo. */
  emJogo: number;
  /** true quando não há um único lead: o desenho passa a ser só a forma. */
  vazio: boolean;
}

function fracao(parte: number, todo: number): number {
  return todo > 0 ? parte / todo : 0;
}

export function montarFunil(contagens: ReadonlyMap<string, number>): Funil {
  const abertas = STAGES.filter((s) => s.open);
  const fechadas = STAGES.filter((s) => !s.open);

  const quantos = (s: StageDefinition) => contagens.get(s.value) ?? 0;

  const emJogo = abertas.reduce((soma, s) => soma + quantos(s), 0);
  const total = STAGES.reduce((soma, s) => soma + quantos(s), 0);
  const vazio = total === 0;

  // O maior e não o primeiro: se houver mais em negociação do que por
  // contactar, o funil incha a meio em vez de estourar a largura máxima.
  const maior = Math.max(...abertas.map(quantos), 0);

  const larguras = abertas.map((s, i) =>
    vazio ? (VAZIO[i] ?? MINIMO) : MINIMO + (1 - MINIMO) * fracao(quantos(s), maior),
  );

  const bandas: BandaDoFunil[] = abertas.map((s, i) => {
    const anterior = i > 0 ? quantos(abertas[i - 1]!) : 0;
    return {
      ...s,
      quantos: quantos(s),
      larguraTopo: larguras[i]!,
      larguraBase: larguras[i + 1] ?? larguras[i]! * BICO,
      parteDoTotal: fracao(quantos(s), total),
      passouDaAnterior: i === 0 || anterior === 0 ? null : quantos(s) / anterior,
    };
  });

  return {
    bandas,
    desfechos: fechadas.map((s) => ({ ...s, quantos: quantos(s) })),
    total,
    emJogo,
    vazio,
  };
}

/** A cor de cada banda, do frio ao laranja da marca. Definidas em globals.css. */
export function corDaBanda(indice: number): string {
  return `var(--funil-${Math.min(indice + 1, 5)})`;
}

export type { DealStage };
