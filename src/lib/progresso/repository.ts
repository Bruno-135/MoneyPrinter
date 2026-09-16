import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { porSemana, quantosHoje, quantosNoMes, sequencia, variacao } from './calculo';
import type { Semana } from './calculo';

type Db = SupabaseClient<Database>;

/**
 * A meta diária, por enquanto uma constante.
 *
 * Ainda não há ecrã onde se escolha nem tabela onde se guarde. Fica declarada
 * aqui, em vez de espalhada pelo meio do desenho, para se ver que é um valor
 * por omissão e não uma coisa que alguém decidiu. O PROGRESSO contra ela é
 * verdadeiro; só o alvo é que é um palpite.
 */
export const META_DIARIA = 20;

export interface Progresso {
  /** Contactos feitos hoje, e a meta. */
  hoje: number;
  meta: number;
  sequenciaAtual: number;
  sequenciaMelhor: number;
  /** Contactos no mês corrente e como variou face ao anterior. */
  contactosMes: number;
  contactosVariacao: string;
  vendasMes: number;
  vendasVariacao: string;
  paginasMes: number;
  paginasVariacao: string;
  semanas: Semana[];
  /** Quando não há nada registado ainda, para se dizer porquê. */
  vazio: boolean;
}

/**
 * O progresso de quem está ligado, tudo do que ficou mesmo registado.
 *
 * As três fontes são diferentes de propósito: o esforço vem de
 * `contact_events`, as vendas de `client_services` e as páginas de
 * `generated_sites`. Nenhuma delas é derivada de outra, e por isso nenhuma
 * mente por arrasto quando outra estiver incompleta.
 */
export async function progresso(db: Db, agora: Date = new Date()): Promise<Progresso> {
  const [contactos, vendas, paginas] = await Promise.all([
    datasDosContactos(db),
    datasDasVendas(db),
    datasDasPaginas(db),
  ]);

  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  // Dezembro recua para Novembro do ano anterior. `Date` trata do resto se se
  // lhe der mês -1, mas aqui as contagens são feitas com números soltos.
  const anoAnterior = mes === 0 ? ano - 1 : ano;
  const mesAnterior = mes === 0 ? 11 : mes - 1;

  const { atual, melhor } = sequencia(contactos, agora);

  const conta = (datas: Date[], oQue: string) => ({
    mes: quantosNoMes(datas, ano, mes),
    variacao: variacao(
      quantosNoMes(datas, ano, mes),
      quantosNoMes(datas, anoAnterior, mesAnterior),
      oQue,
    ),
  });

  const c = conta(contactos, 'vs mês passado');
  const v = conta(vendas, 'vs mês passado');
  const p = conta(paginas, 'vs mês passado');

  return {
    hoje: quantosHoje(contactos, agora),
    meta: META_DIARIA,
    sequenciaAtual: atual,
    sequenciaMelhor: melhor,
    contactosMes: c.mes,
    contactosVariacao: c.variacao,
    vendasMes: v.mes,
    vendasVariacao: v.variacao,
    paginasMes: p.mes,
    paginasVariacao: p.variacao,
    semanas: porSemana(contactos, 8, agora),
    vazio: contactos.length === 0,
  };
}

/**
 * As datas de uma coluna, já como `Date`.
 *
 * Uma função por tabela e não uma genérica com o nome da coluna em variável: o
 * PostgREST deduz os tipos a partir do texto literal do `select`, e com o nome
 * em variável a resposta vem sem tipo nenhum.
 *
 * O limite de 5000 é generoso e deliberado: o PostgREST corta às mil por
 * omissão, e isso aqui dava uma sequência de dias que parava de crescer sem
 * nenhum sinal de que alguma coisa estava mal.
 */
const LIMITE = 5000;

async function datasDosContactos(db: Db): Promise<Date[]> {
  const { data, error } = await db
    .from('contact_events')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(LIMITE);

  if (error) throw new Error(`Não foi possível ler os contactos: ${error.message}`);
  return (data ?? []).map((l) => new Date(l.created_at));
}

async function datasDasVendas(db: Db): Promise<Date[]> {
  const { data, error } = await db
    .from('client_services')
    .select('sold_at')
    .order('sold_at', { ascending: true })
    .limit(LIMITE);

  if (error) throw new Error(`Não foi possível ler as vendas: ${error.message}`);
  return (data ?? []).map((l) => new Date(l.sold_at));
}

async function datasDasPaginas(db: Db): Promise<Date[]> {
  const { data, error } = await db
    .from('generated_sites')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(LIMITE);

  if (error) throw new Error(`Não foi possível ler as páginas: ${error.message}`);
  return (data ?? []).map((l) => new Date(l.created_at));
}
