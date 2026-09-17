import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { SERVICOS, type Servico } from './catalogo';

/**
 * O que cada cliente já comprou.
 *
 * `deals` responde a "em que pé está a conversa". Isto responde a "o que é que
 * ele paga". São perguntas diferentes e por isso vivem em tabelas diferentes —
 * houve dois dias em que o valor da venda esteve dentro de `deals`, e deixou de
 * servir no momento em que passaram a existir sete serviços: uma coluna só não
 * diz O QUÊ se vendeu, e sem isso não há como perguntar quem tem site e ainda
 * não tem cardápio.
 */

type Db = SupabaseClient<Database>;

export interface ServicoVendido {
  id: string;
  slug: string;
  /** A definição do catálogo, quando o slug ainda lá existe. */
  servico: Servico | null;
  valorCentimos: number | null;
  mensal: boolean;
  moeda: string;
  vendidoEm: string;
  canceladoEm: string | null;
}

const PORSLUG = new Map(SERVICOS.map((s) => [s.slug, s]));

function montar(linha: Database['public']['Tables']['client_services']['Row']): ServicoVendido {
  return {
    id: linha.id,
    slug: linha.service_slug,
    // Null quando o serviço saiu do catálogo. A venda continua a contar: o
    // cliente pagou, e apagá-la da vista por o produto ter mudado de nome
    // seria perder faturação real.
    servico: PORSLUG.get(linha.service_slug) ?? null,
    valorCentimos: linha.value_cents,
    mensal: linha.is_monthly,
    moeda: linha.currency,
    vendidoEm: linha.sold_at,
    canceladoEm: linha.cancelled_at,
  };
}

export async function servicosDoCliente(db: Db, businessId: string): Promise<ServicoVendido[]> {
  const { data, error } = await db
    .from('client_services')
    .select('*')
    .eq('business_id', businessId)
    .order('sold_at', { ascending: true });

  if (error) throw new Error(`Não foi possível ler os serviços do cliente: ${error.message}`);
  return (data ?? []).map(montar);
}

export async function registarServico(
  db: Db,
  businessId: string,
  venda: { slug: string; valorCentimos: number | null; mensal: boolean; moeda: string },
): Promise<void> {
  const { error } = await db.from('client_services').upsert(
    {
      business_id: businessId,
      service_slug: venda.slug,
      value_cents: venda.valorCentimos,
      is_monthly: venda.mensal,
      currency: venda.moeda,
      // Registar outra vez o mesmo serviço é corrigir o valor, não uma segunda
      // venda — e reabre um que estivesse cancelado.
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,service_slug' },
  );

  if (error) throw new Error(`Não foi possível registar o serviço: ${error.message}`);
}

/**
 * Marca como cancelado, sem apagar.
 *
 * Deixa de contar para o que se recebe este mês e continua a fazer parte da
 * história. Quem já foi cliente é quem é mais fácil de recuperar, e apagar a
 * linha era perder exatamente essa informação.
 */
export async function cancelarServico(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('client_services')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Não foi possível cancelar o serviço: ${error.message}`);
}

/** Apaga mesmo. Para quando se registou por engano. */
export async function apagarServico(db: Db, id: string): Promise<void> {
  const { error } = await db.from('client_services').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível apagar o serviço: ${error.message}`);
}

export interface ClienteNaCarteira {
  businessId: string;
  nome: string;
  /** A referência curta — CLI-0042. Nula só em dados anteriores a 0029. */
  codigo: string | null;
  locality: string | null;
  phone: string | null;
  /** Slugs activos, para a tabela pôr um visto em cada coluna. */
  ativos: string[];
  /** Slugs que já teve e cancelou. */
  cancelados: string[];
  mensalCentimos: number;
  unicoCentimos: number;
  moeda: string;
}

/**
 * A carteira: quem já comprou alguma coisa, e o quê.
 *
 * Feita para se ler de cima a baixo à procura de buracos — quem tem site e não
 * tem cardápio, quem tem cardápio e nunca fez a ficha do Google. É aí que está
 * o dinheiro mais barato que há, porque a prospeção já foi paga.
 */
export async function carteira(db: Db): Promise<ClienteNaCarteira[]> {
  const { data, error } = await db
    .from('client_services')
    .select('business_id, service_slug, value_cents, is_monthly, currency, cancelled_at, businesses(name, client_code, locality, phone_e164, phone_raw)')
    .order('sold_at', { ascending: false });

  if (error) throw new Error(`Não foi possível ler a carteira: ${error.message}`);

  const porCliente = new Map<string, ClienteNaCarteira>();

  for (const linha of data ?? []) {
    const negocio = linha.businesses as {
      name: string;
      client_code: string | null;
      locality: string | null;
      phone_e164: string | null;
      phone_raw: string | null;
    } | null;
    if (!negocio) continue;

    let cliente = porCliente.get(linha.business_id);
    if (!cliente) {
      cliente = {
        businessId: linha.business_id,
        nome: negocio.name,
        codigo: negocio.client_code,
        locality: negocio.locality,
        phone: negocio.phone_e164 ?? negocio.phone_raw ?? null,
        ativos: [],
        cancelados: [],
        mensalCentimos: 0,
        unicoCentimos: 0,
        moeda: linha.currency,
      };
      porCliente.set(linha.business_id, cliente);
    }

    if (linha.cancelled_at) {
      cliente.cancelados.push(linha.service_slug);
      continue;
    }

    cliente.ativos.push(linha.service_slug);
    // O cancelado não entra nas contas: a soma é do que se recebe, não do que
    // já se recebeu alguma vez.
    if (linha.value_cents !== null) {
      if (linha.is_monthly) cliente.mensalCentimos += linha.value_cents;
      else cliente.unicoCentimos += linha.value_cents;
    }
  }

  // Quem paga mais todos os meses primeiro: é a lista por onde se começa
  // quando se quer cuidar de quem já lá está.
  return [...porCliente.values()].sort(
    (a, b) => b.mensalCentimos - a.mensalCentimos || b.ativos.length - a.ativos.length,
  );
}
