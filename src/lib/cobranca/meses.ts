/**
 * Quem se cobra em que mês, sem base de dados pelo meio.
 *
 * Esta é a parte do dinheiro que é mais fácil de errar por um dia. Um serviço
 * vendido a 30 de Setembro conta para Setembro ou para Outubro? Um cancelado a
 * 3 de Novembro ainda se cobra em Novembro?
 *
 * As regras escolhidas, e o porquê de cada uma:
 *
 *   VENDIDO durante o mês → cobra-se nesse mês. Quem começou a ser servido a 30
 *   não deixou de ser servido, e adiar a primeira cobrança para o mês seguinte
 *   é oferecer trabalho sem dar por isso.
 *
 *   CANCELADO durante o mês → cobra-se nesse mês na mesma. O mês foi servido
 *   até ao dia em que ele cancelou. Não cobrar seria oferecer o mês inteiro a
 *   quem desistiu a meio.
 *
 *   Sem proporcionalidade. Meio mês custa um mês, dos dois lados. É a regra que
 *   toda a gente nestes valores usa, e a que não obriga ninguém a explicar uma
 *   conta de dias ao telefone.
 */

export interface ServicoMensal {
  businessId: string;
  valorCentimos: number;
  moeda: string;
  /** ISO. Quando a venda foi feita. */
  vendidoEm: string;
  /** ISO, ou null se continua activo. */
  canceladoEm: string | null;
}

export interface Mensalidade {
  businessId: string;
  /** A soma dos serviços mensais activos naquele mês. */
  totalCentimos: number;
  moeda: string;
  quantosServicos: number;
}

/** O primeiro dia do mês, em 'aaaa-mm-01'. É a chave de `client_payments`. */
export function periodo(ano: number, mes: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
}

const NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** "Setembro de 2026", para o cabeçalho. */
export function nomeDoMes(ano: number, mes: number): string {
  return `${NOMES[mes]} de ${ano}`;
}

/** Anda N meses para trás ou para a frente, sem estourar o ano. */
export function mover(ano: number, mes: number, passos: number): { ano: number; mes: number } {
  const total = ano * 12 + mes + passos;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

/** true quando este serviço se cobra neste mês. Ver as regras no topo. */
export function cobraSeEm(servico: ServicoMensal, ano: number, mes: number): boolean {
  const inicioDoMes = new Date(ano, mes, 1, 0, 0, 0, 0);
  const fimDoMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

  const vendido = new Date(servico.vendidoEm);
  // Vendido depois do mês acabar: ainda não era cliente.
  if (vendido > fimDoMes) return false;

  if (servico.canceladoEm !== null) {
    const cancelado = new Date(servico.canceladoEm);
    // Cancelado ANTES de o mês começar: já não era cliente.
    if (cancelado < inicioDoMes) return false;
  }

  return true;
}

/**
 * O que há a cobrar num mês, cliente a cliente.
 *
 * Só entram os que têm alguma coisa a pagar. Um cliente que cancelou tudo não
 * é uma linha a zero na lista de cobranças — é um cliente que já não está lá.
 */
export function mensalidadesDoMes(
  servicos: readonly ServicoMensal[],
  ano: number,
  mes: number,
): Mensalidade[] {
  const porCliente = new Map<string, Mensalidade>();

  for (const s of servicos) {
    if (!cobraSeEm(s, ano, mes)) continue;

    const atual = porCliente.get(s.businessId);
    if (atual) {
      atual.totalCentimos += s.valorCentimos;
      atual.quantosServicos += 1;
    } else {
      porCliente.set(s.businessId, {
        businessId: s.businessId,
        totalCentimos: s.valorCentimos,
        moeda: s.moeda,
        quantosServicos: 1,
      });
    }
  }

  return [...porCliente.values()].filter((m) => m.totalCentimos > 0);
}

/** Soma por moeda. Nunca uma só: euros e reais não se somam. */
export function totaisPorMoeda(
  linhas: readonly { totalCentimos: number; moeda: string }[],
): [string, number][] {
  const por = new Map<string, number>();
  for (const l of linhas) por.set(l.moeda, (por.get(l.moeda) ?? 0) + l.totalCentimos);
  return [...por.entries()].sort((a, b) => b[1] - a[1]);
}
