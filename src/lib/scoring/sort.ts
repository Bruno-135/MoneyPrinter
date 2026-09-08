/**
 * Por que ordem se mostra a lista de prospetos.
 *
 * Havia uma só: score decrescente. Funcionava com um varrimento feito e deixou
 * de funcionar ao quarto — com quase quinhentos comércios na lista, os que
 * acabaram de sair da última procura ficam espalhados por toda a tabela, cada
 * um no seu lugar por probabilidade. Quem acabou de procurar quer ver o que
 * acabou de encontrar.
 */

export type ProspectSort = 'score' | 'adicionados' | 'recentes' | 'avaliacoes' | 'nome';

export const SORTS: ReadonlyArray<{ value: ProspectSort; label: string }> = [
  { value: 'score', label: 'Relevância' },
  { value: 'adicionados', label: 'Adicionados há menos tempo' },
  { value: 'recentes', label: 'Vistos na última procura' },
  { value: 'avaliacoes', label: 'Mais avaliações' },
  { value: 'nome', label: 'Nome (A-Z)' },
];

/**
 * Que data mostrar na lista, para cada ordem.
 *
 * A data visível acompanha a ordem escolhida. Mostrar sempre a mesma faria a
 * lista parecer desordenada: ordenada por "adicionados", com a data da última
 * procura por baixo de cada nome, os números não bateriam certo com a ordem — e
 * quem olha conclui, com razão, que aquilo está partido.
 */
export function dateShownFor(sort: ProspectSort): 'first' | 'last' {
  return sort === 'recentes' ? 'last' : 'first';
}

export const DEFAULT_SORT: ProspectSort = 'score';

export function isProspectSort(value: unknown): value is ProspectSort {
  return typeof value === 'string' && SORTS.some((sort) => sort.value === value);
}

/**
 * Diz há quanto tempo, em linguagem de pessoa.
 *
 * A data completa não diz nada a quem está a olhar para a lista: "12/09, 14:32"
 * obriga a fazer a conta de cabeça. "há 2 horas" responde à pergunta que se
 * está mesmo a fazer, que é se aquilo saiu da procura de agora ou da semana
 * passada.
 *
 * O `agora` é um parâmetro e não `Date.now()` lá dentro por causa dos testes —
 * uma função que lê o relógio sozinha não se consegue testar sem o congelar.
 */
export function describeWhen(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return '';

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const seconds = Math.floor((agora.getTime() - then.getTime()) / 1000);

  // Datas no futuro são relógios dessincronizados, não viagens no tempo. Dizer
  // "há -3 minutos" seria pior do que não dizer nada.
  if (seconds < 60) return 'agora mesmo';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;

  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}
