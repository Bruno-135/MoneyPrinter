/**
 * Os prazos dos pedidos de suporte, sem base de dados pelo meio.
 *
 * A pergunta que este ficheiro responde é sempre a mesma: este pedido está
 * atrasado? E a resposta é fácil de errar por meio dia — um pedido para "hoje"
 * está dentro do prazo até ao fim do dia, não até à hora a que foi criado.
 *
 * Tudo em dias LOCAIS, como no progresso: um prazo para hoje acaba às 23:59 de
 * quem está a ver, não às 23:59 em UTC.
 */

export type Estado =
  | 'atrasado'
  | 'hoje'
  | 'amanha'
  | 'a_caminho'
  | 'fechado_no_prazo'
  | 'fechado_atrasado';

export interface Prazo {
  estado: Estado;
  /** Dias de atraso, ou 0. Sempre positivo. */
  atraso: number;
  /** A frase da etiqueta: "fora de prazo · 2 dias", "hoje", "em 3 dias". */
  etiqueta: string;
  /** true para o que precisa de atenção agora. */
  urgente: boolean;
}

/** Meia-noite do dia de uma data, no fuso de quem está a ver. */
function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Diferença em dias inteiros entre dois dias locais. */
function diasEntre(de: Date, ate: Date): number {
  const ms = inicioDoDia(ate).getTime() - inicioDoDia(de).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Em que pé está um pedido.
 *
 * Um pedido fechado julga-se pelo dia em que ficou feito contra o dia
 * prometido, e não pela hora: prometer "quinta" e entregar quinta às 18h é ter
 * cumprido, mesmo que o prazo tenha sido criado às 9h da manhã.
 */
export function prazo(dueAt: string, closedAt: string | null, agora: Date = new Date()): Prazo {
  const limite = new Date(dueAt);

  if (closedAt !== null) {
    const fechado = new Date(closedAt);
    const dias = diasEntre(limite, fechado);
    return dias > 0
      ? {
          estado: 'fechado_atrasado',
          atraso: dias,
          etiqueta: dias === 1 ? 'fechado 1 dia tarde' : `fechado ${dias} dias tarde`,
          urgente: false,
        }
      : { estado: 'fechado_no_prazo', atraso: 0, etiqueta: 'fechado no prazo', urgente: false };
  }

  const dias = diasEntre(agora, limite);

  if (dias < 0) {
    const atraso = -dias;
    return {
      estado: 'atrasado',
      atraso,
      etiqueta: atraso === 1 ? 'fora de prazo · 1 dia' : `fora de prazo · ${atraso} dias`,
      urgente: true,
    };
  }
  if (dias === 0) return { estado: 'hoje', atraso: 0, etiqueta: 'hoje', urgente: true };
  if (dias === 1) return { estado: 'amanha', atraso: 0, etiqueta: 'amanhã', urgente: false };
  return { estado: 'a_caminho', atraso: 0, etiqueta: `em ${dias} dias`, urgente: false };
}

/**
 * A ordem por que se trabalha: o atrasado primeiro, e dentro do atrasado o que
 * está atrasado há mais tempo.
 *
 * Os fechados vão sempre para o fim, por muito recentes que sejam. A lista é
 * para trabalhar, não para admirar o que já se fez.
 *
 * Não precisa de saber que horas são: a ordem sai toda da comparação entre as
 * datas, e o que está atrasado fica no topo por ter o prazo mais curto.
 */
export function porUrgencia<T extends { due_at: string; closed_at: string | null }>(
  pedidos: readonly T[],
): T[] {
  return [...pedidos].sort((a, b) => {
    const fechadoA = a.closed_at !== null;
    const fechadoB = b.closed_at !== null;
    if (fechadoA !== fechadoB) return fechadoA ? 1 : -1;

    if (fechadoA && fechadoB) {
      // Entre fechados, o mais recente primeiro.
      return new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime();
    }

    // Entre abertos, o de prazo mais curto primeiro — o que põe os atrasados
    // no topo sem precisar de os tratar à parte.
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

/** Quantos prazos por escolher no formulário, com o mais usado primeiro. */
export const PRAZOS = [
  { dias: 0, label: 'Hoje' },
  { dias: 1, label: 'Amanhã' },
  { dias: 2, label: 'Em 2 dias' },
  { dias: 7, label: 'Numa semana' },
] as const;

/** O fim do dia daqui a N dias. Um prazo acaba às 23:59, não à hora de agora. */
export function limiteEmDias(dias: number, agora: Date = new Date()): Date {
  const d = new Date(agora);
  d.setDate(d.getDate() + dias);
  d.setHours(23, 59, 59, 999);
  return d;
}
