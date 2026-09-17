import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { mensalidadesDoMes, periodo, type ServicoMensal } from './meses';

type Db = SupabaseClient<Database>;

export type Estado = 'pago' | 'falhou' | 'pendente';

export interface LinhaDeCobranca {
  businessId: string;
  nome: string;
  /** A referência do cliente — é o que vai na fatura. */
  codigo: string | null;
  localidade: string | null;
  telefone: string | null;
  /** O que ele devia pagar este mês, dos serviços activos. */
  totalCentimos: number;
  moeda: string;
  quantosServicos: number;
  estado: Estado;
  /** O valor guardado quando se marcou, se já se marcou. */
  cobradoCentimos: number | null;
  pagoEm: string | null;
  nota: string | null;
}

interface ServicoLinha {
  business_id: string;
  value_cents: number | null;
  currency: string;
  sold_at: string;
  cancelled_at: string | null;
  businesses: {
    name: string;
    client_code: string | null;
    locality: string | null;
    phone_e164: string | null;
    phone_raw: string | null;
  } | null;
}

/**
 * A cobrança de um mês.
 *
 * As mensalidades CALCULAM-SE a partir de `client_services` — quem tinha
 * serviço activo naquele mês — e o estado vem de `client_payments`. Não há
 * geração mensal de linhas: um trabalho que corre uma vez por mês é um trabalho
 * que mais cedo ou mais tarde falha em silêncio, e o mês fica sem cobranças sem
 * ninguém dar por isso.
 *
 * Sem linha em `client_payments`, o estado é `pendente` — do mesmo modo que um
 * comércio sem linha em `deals` está por contactar.
 */
export async function cobrancaDoMes(db: Db, ano: number, mes: number): Promise<LinhaDeCobranca[]> {
  const chave = periodo(ano, mes);

  const [servicos, pagamentos] = await Promise.all([
    db
      .from('client_services')
      .select('business_id, value_cents, currency, sold_at, cancelled_at, businesses(name, client_code, locality, phone_e164, phone_raw)')
      .eq('is_monthly', true)
      .limit(2000),
    db.from('client_payments').select('*').eq('period', chave).limit(2000),
  ]);

  if (servicos.error) {
    throw new Error(`Não foi possível ler os serviços: ${servicos.error.message}`);
  }
  if (pagamentos.error) {
    throw new Error(`Não foi possível ler os pagamentos: ${pagamentos.error.message}`);
  }

  const linhas = servicos.data as unknown as ServicoLinha[];

  const negocios = new Map<string, ServicoLinha['businesses']>();
  const paraCalculo: ServicoMensal[] = [];

  for (const l of linhas) {
    if (!l.businesses) continue;
    negocios.set(l.business_id, l.businesses);
    paraCalculo.push({
      businessId: l.business_id,
      valorCentimos: l.value_cents ?? 0,
      moeda: l.currency,
      vendidoEm: l.sold_at,
      canceladoEm: l.cancelled_at,
    });
  }

  const porCliente = new Map((pagamentos.data ?? []).map((p) => [p.business_id, p]));

  return mensalidadesDoMes(paraCalculo, ano, mes)
    .map((m): LinhaDeCobranca => {
      const negocio = negocios.get(m.businessId)!;
      const pago = porCliente.get(m.businessId);

      return {
        businessId: m.businessId,
        nome: negocio.name,
        codigo: negocio.client_code,
        localidade: negocio.locality,
        telefone: negocio.phone_e164 ?? negocio.phone_raw ?? null,
        totalCentimos: m.totalCentimos,
        moeda: m.moeda,
        quantosServicos: m.quantosServicos,
        estado: (pago?.status as Estado | undefined) ?? 'pendente',
        cobradoCentimos: pago?.amount_cents ?? null,
        pagoEm: pago?.paid_at ?? null,
        nota: pago?.note ?? null,
      };
    })
    // Por receber primeiro: falhados, depois pendentes, e os pagos no fim. A
    // lista é para ir atrás de dinheiro, não para admirar o que já entrou.
    .sort((a, b) => {
      const peso = (e: Estado) => (e === 'falhou' ? 0 : e === 'pendente' ? 1 : 2);
      const d = peso(a.estado) - peso(b.estado);
      return d !== 0 ? d : b.totalCentimos - a.totalCentimos;
    });
}

/**
 * Marca o mês de um cliente.
 *
 * O valor fica CONGELADO no momento da marcação. Se em Janeiro ele pagava 30 €
 * e em Abril passou a pagar 45, o mês de Janeiro tem de continuar a dizer 30
 * para sempre — um histórico que se recalcula com os preços de hoje não é um
 * histórico.
 */
export async function marcar(
  db: Db,
  dados: {
    businessId: string;
    ano: number;
    mes: number;
    estado: Estado;
    valorCentimos: number;
    moeda: string;
    nota?: string | null;
  },
): Promise<void> {
  const { error } = await db.from('client_payments').upsert(
    {
      business_id: dados.businessId,
      period: periodo(dados.ano, dados.mes),
      amount_cents: dados.valorCentimos,
      currency: dados.moeda,
      status: dados.estado,
      paid_at: dados.estado === 'pago' ? new Date().toISOString() : null,
      note: dados.nota?.trim() || null,
    },
    { onConflict: 'business_id,period' },
  );

  if (error) throw new Error(`Não foi possível marcar o pagamento: ${error.message}`);
}

/** Tira a marca e volta ao estado normal: sem linha, pendente. */
export async function desmarcar(
  db: Db,
  businessId: string,
  ano: number,
  mes: number,
): Promise<void> {
  const { error } = await db
    .from('client_payments')
    .delete()
    .eq('business_id', businessId)
    .eq('period', periodo(ano, mes));

  if (error) throw new Error(`Não foi possível desmarcar: ${error.message}`);
}

export interface ResumoDoMes {
  porReceber: [string, number][];
  recebido: [string, number][];
  quantosFalharam: number;
  quantosPendentes: number;
}

/** O resumo para o painel, sem trazer a lista toda. */
export async function resumoDoMes(db: Db, agora: Date = new Date()): Promise<ResumoDoMes> {
  const linhas = await cobrancaDoMes(db, agora.getFullYear(), agora.getMonth());

  const somar = (quais: LinhaDeCobranca[]) => {
    const por = new Map<string, number>();
    for (const l of quais) {
      const valor = l.estado === 'pago' ? (l.cobradoCentimos ?? l.totalCentimos) : l.totalCentimos;
      por.set(l.moeda, (por.get(l.moeda) ?? 0) + valor);
    }
    return [...por.entries()].sort((a, b) => b[1] - a[1]);
  };

  return {
    porReceber: somar(linhas.filter((l) => l.estado !== 'pago')),
    recebido: somar(linhas.filter((l) => l.estado === 'pago')),
    quantosFalharam: linhas.filter((l) => l.estado === 'falhou').length,
    quantosPendentes: linhas.filter((l) => l.estado === 'pendente').length,
  };
}
