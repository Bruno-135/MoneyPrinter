/**
 * As contas do progresso, separadas da base de dados.
 *
 * Ficam aqui sozinhas por serem a parte fácil de enganar: uma sequência de dias
 * mal contada dá um número que parece bom e é falso, e ninguém dá por isso
 * porque não há com o que comparar. Sem base de dados pelo meio, testam-se com
 * datas escritas à mão.
 *
 * Tudo trabalha em dias LOCAIS e não em UTC. Um contacto feito às 23:30 em
 * Lisboa pertence a esse dia, e em UTC já é o dia seguinte — o que partia a
 * sequência de quem trabalha à noite.
 */

/** O dia de uma data, em texto, no fuso de quem está a ver. */
export function diaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export interface Sequencia {
  /** Dias seguidos até hoje. Zero quando hoje e ontem estão vazios. */
  atual: number;
  /** A melhor sequência de sempre, para haver o que bater. */
  melhor: number;
}

/**
 * Quantos dias seguidos houve trabalho.
 *
 * A sequência actual conta para trás a partir de HOJE, mas aceita começar
 * ONTEM: às nove da manhã ainda não se fez nada e a sequência de catorze dias
 * não pode aparecer a zero — só se parte quando ontem também ficou vazio.
 */
export function sequencia(datas: readonly Date[], hoje: Date = new Date()): Sequencia {
  const dias = new Set(datas.map(diaLocal));
  if (dias.size === 0) return { atual: 0, melhor: 0 };

  const ordenados = [...dias].sort();

  // A melhor de sempre: percorre-se a lista ordenada e conta-se cada corrida.
  let melhor = 1;
  let corrida = 1;
  for (let i = 1; i < ordenados.length; i += 1) {
    corrida = seguidos(ordenados[i - 1]!, ordenados[i]!) ? corrida + 1 : 1;
    if (corrida > melhor) melhor = corrida;
  }

  // A actual: para trás a partir de hoje, ou de ontem se hoje ainda está vazio.
  const inicio = new Date(hoje);
  if (!dias.has(diaLocal(inicio))) inicio.setDate(inicio.getDate() - 1);

  let atual = 0;
  const cursor = new Date(inicio);
  while (dias.has(diaLocal(cursor))) {
    atual += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { atual, melhor };
}

/** true quando `b` é o dia logo a seguir a `a`. Ambos em 'aaaa-mm-dd'. */
function seguidos(a: string, b: string): boolean {
  const anterior = new Date(`${a}T12:00:00`);
  anterior.setDate(anterior.getDate() + 1);
  return diaLocal(anterior) === b;
}

export interface Semana {
  /** 'S1' a 'S8', da mais antiga para a mais recente. */
  rotulo: string;
  quantos: number;
}

/**
 * Quantos por semana, nas últimas N semanas, terminando na de hoje.
 *
 * Semanas de sete dias a contar para trás a partir de hoje, e não semanas de
 * calendário: o gráfico é para comparar "estes sete dias" com "os sete
 * anteriores", e uma semana de calendário a meio faz a última barra parecer
 * sempre pior do que é.
 */
export function porSemana(
  datas: readonly Date[],
  semanas: number,
  hoje: Date = new Date(),
): Semana[] {
  const fim = new Date(hoje);
  fim.setHours(23, 59, 59, 999);

  const baldes: Semana[] = [];
  for (let i = semanas - 1; i >= 0; i -= 1) {
    const ate = new Date(fim);
    ate.setDate(ate.getDate() - i * 7);
    const de = new Date(ate);
    de.setDate(de.getDate() - 6);
    de.setHours(0, 0, 0, 0);

    baldes.push({
      rotulo: `S${semanas - i}`,
      quantos: datas.filter((d) => d >= de && d <= ate).length,
    });
  }
  return baldes;
}

/**
 * Como variou face ao período anterior, escrito para se ler.
 *
 * De zero para alguma coisa não é "+∞%" nem "+100%": é "o primeiro". Uma
 * percentagem calculada sobre zero é sempre uma mentira com ar de exactidão.
 */
export function variacao(atual: number, anterior: number, oQue: string): string {
  if (anterior === 0 && atual === 0) return `nada ${oQue}`;
  if (anterior === 0) return `os primeiros ${oQue}`;
  if (atual === anterior) return `igual ${oQue}`;

  const pontos = Math.round(((atual - anterior) / anterior) * 100);
  return `${pontos > 0 ? '+' : ''}${pontos}% ${oQue}`;
}

/** Contactos de hoje, para a barra da meta diária. */
export function quantosHoje(datas: readonly Date[], hoje: Date = new Date()): number {
  const dia = diaLocal(hoje);
  return datas.filter((d) => diaLocal(d) === dia).length;
}

/** Quantos caem dentro de um mês, pelo ano e mês locais. */
export function quantosNoMes(datas: readonly Date[], ano: number, mes: number): number {
  return datas.filter((d) => d.getFullYear() === ano && d.getMonth() === mes).length;
}
