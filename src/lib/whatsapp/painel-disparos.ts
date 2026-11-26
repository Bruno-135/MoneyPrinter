import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { CATEGORIES } from '@/lib/places/categories';
import { ehEscolhaDeContacto } from '@/lib/deals/contacto';
import { lerLinhasWhatsapp } from './repository';
import { ehFaixaDeScore, filtrar, ordenar, type Filtros, type FaixaDeScore } from './lista';
import { mensagemDeAbertura } from './mensagem';
import {
  aplicarModelo,
  comLinhaParaSair,
  lerNumerosColados,
  soDigitos,
  type Pais,
} from './disparos';

type Db = SupabaseClient<Database>;
export type ChipRow = Database['public']['Tables']['whatsapp_chips']['Row'];
export type CampanhaRow = Database['public']['Tables']['whatsapp_campanhas']['Row'];

/** O PostgREST corta às mil linhas; isto chega para a escala de agora. */
const PAGINA = 1000;
const TECTO = 20_000;

async function todasAsLinhas<T>(
  ler: (
    de: number,
    ate: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; de < TECTO; de += PAGINA) {
    const { data, error } = await ler(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    linhas.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) break;
  }
  return linhas;
}

export interface ChipComContas extends ChipRow {
  disparosHoje: number;
  aquecimentosHoje: number;
}

/** Os chips, com quantos disparos e mensagens de aquecimento fizeram nas últimas 24 h. */
export async function lerChips(db: Db): Promise<ChipComContas[]> {
  const { data: chips, error } = await db.from('whatsapp_chips').select('*').order('created_at');
  if (error) throw new Error(`Não foi possível ler os chips: ${error.message}`);
  if (!chips || chips.length === 0) return [];

  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const envios = await todasAsLinhas((de, ate) =>
    db
      .from('whatsapp_envios')
      .select('chip_id, aquecimento')
      .in(
        'chip_id',
        chips.map((c) => c.id),
      )
      .in('estado', ['enviado', 'a_enviar'])
      .gt('tentado_em', desde)
      .range(de, ate),
  );
  return chips.map((c) => ({
    ...c,
    disparosHoje: envios.filter((e) => e.chip_id === c.id && !e.aquecimento).length,
    aquecimentosHoje: envios.filter((e) => e.chip_id === c.id && e.aquecimento).length,
  }));
}

export interface ContasDaCampanha {
  total: number;
  pendentes: number;
  enviados: number;
  falhados: number;
  responderam: number;
  sairam: number;
  excluidos: number;
}

export function contarEnvios(
  envios: readonly {
    estado: string;
    respondeu_em: string | null;
    erro: string | null;
  }[],
): ContasDaCampanha {
  const c: ContasDaCampanha = {
    total: envios.length,
    pendentes: 0,
    enviados: 0,
    falhados: 0,
    responderam: 0,
    sairam: 0,
    excluidos: 0,
  };
  for (const e of envios) {
    if (e.estado === 'pendente' || e.estado === 'a_enviar') c.pendentes++;
    else if (e.estado === 'enviado') c.enviados++;
    else if (e.estado === 'falhou') c.falhados++;
    else if (e.estado === 'excluido') c.excluidos++;
    if (e.respondeu_em) c.responderam++;
    if (e.erro === 'pediu para sair') c.sairam++;
  }
  return c;
}

/** Os disparos (sem a campanha interna do aquecimento), os mais recentes primeiro. */
export async function lerCampanhas(
  db: Db,
): Promise<(CampanhaRow & { contas: ContasDaCampanha })[]> {
  const { data: campanhas, error } = await db
    .from('whatsapp_campanhas')
    .select('*')
    .eq('tipo', 'disparo')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(`Não foi possível ler os disparos: ${error.message}`);
  if (!campanhas || campanhas.length === 0) return [];

  const envios = await todasAsLinhas((de, ate) =>
    db
      .from('whatsapp_envios')
      .select('campanha_id, estado, respondeu_em, erro')
      .in(
        'campanha_id',
        campanhas.map((k) => k.id),
      )
      .range(de, ate),
  );
  return campanhas.map((k) => ({
    ...k,
    contas: contarEnvios(envios.filter((e) => e.campanha_id === k.id)),
  }));
}

// ---------------------------------------------------------------------------
// O pedido de um disparo novo: o mesmo formulário serve a pré-visualização
// (GET, na página) e a criação (POST, na acção), que refaz a seleção do zero.
// ---------------------------------------------------------------------------

export interface PedidoDeDisparo {
  origem: 'leads' | 'colados';
  filtros: Filtros;
  colados: string;
  paisColados: Pais;
  modo: 'auto' | 'manual';
  modelo: string;
  sair: boolean;
  maximo: number;
  nome: string;
  horaInicio: number;
  horaFim: number;
  chips: string[];
}

export const MAXIMO_POR_DISPARO = 500;

function inteiro(valor: string | undefined, porOmissao: number, min: number, max: number): number {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porOmissao;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerPedido(p: Record<string, string | string[] | undefined>): PedidoDeDisparo {
  const um = (k: string) => {
    const v = p[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const varios = (k: string) => {
    const v = p[k];
    return (Array.isArray(v) ? v : v ? [v] : []).filter((x) => UUID.test(x));
  };
  const pais = um('pais');
  const ramo = um('ramo');
  const faixa = um('score');
  const contacto = um('contacto') ?? 'por';
  const hoje = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
  });
  const horaInicio = inteiro(um('inicio'), 9, 0, 23);
  return {
    origem: um('origem') === 'colados' ? 'colados' : 'leads',
    filtros: {
      pais: pais === 'PT' || pais === 'BR' ? pais : '',
      ramo: CATEGORIES.some((c) => c.slug === ramo) ? ramo! : '',
      faixa: ehFaixaDeScore(faixa) ? (faixa as FaixaDeScore) : '',
      contacto: ehEscolhaDeContacto(contacto) ? contacto : '',
      numero: 'movel',
    },
    colados: (um('colados') ?? '').slice(0, 50_000),
    paisColados: um('pais_colados') === 'BR' ? 'BR' : 'PT',
    modo: um('modo') === 'manual' ? 'manual' : 'auto',
    modelo: (um('modelo') ?? '').slice(0, 3000),
    sair: um('sair') !== 'nao',
    maximo: inteiro(um('maximo'), 30, 1, MAXIMO_POR_DISPARO),
    nome: (um('nome') ?? '').trim().slice(0, 120) || `Disparo ${hoje}`,
    horaInicio,
    horaFim: Math.max(horaInicio + 1, inteiro(um('fim'), 19, 1, 24)),
    chips: varios('chip'),
  };
}

export interface DestinatarioPronto {
  numero: string;
  nome: string;
  pais: Pais;
  businessId: string | null;
  /** Pode levar {saudacao}: a base troca-o na hora do envio. */
  texto: string;
}

export interface Selecao {
  destinatarios: DestinatarioPronto[];
  naoContactar: number;
  jaReceberam: number;
  invalidos: number;
  foraDoMaximo: number;
  erro: string | null;
}

/**
 * Quem recebe, com que texto. Fica de fora quem está em «não contactar» (pelo
 * lead ou pelo número), quem já recebeu ou está na fila de outro disparo, e os
 * números que não se percebem. Depois corta-se ao máximo escolhido, pelos
 * melhores scores primeiro.
 */
export async function selecionar(db: Db, pedido: PedidoDeDisparo): Promise<Selecao> {
  const vazio: Selecao = {
    destinatarios: [],
    naoContactar: 0,
    jaReceberam: 0,
    invalidos: 0,
    foraDoMaximo: 0,
    erro: null,
  };
  if (pedido.modo === 'manual' && !pedido.modelo.trim()) {
    return { ...vazio, erro: 'Escreva a mensagem.' };
  }
  if (pedido.origem === 'colados' && pedido.modo === 'auto') {
    return {
      ...vazio,
      erro: 'A mensagem automática usa o ramo e o site de cada lead. Para números colados, escreva a mensagem.',
    };
  }

  const [bloqueados, naFila] = await Promise.all([
    todasAsLinhas((de, ate) =>
      db.from('nao_contactar').select('business_id, telefone').range(de, ate),
    ),
    todasAsLinhas((de, ate) =>
      db
        .from('whatsapp_envios')
        .select('numero')
        .eq('aquecimento', false)
        .in('estado', ['pendente', 'a_enviar', 'enviado'])
        .range(de, ate),
    ),
  ]);
  const negociosBloqueados = new Set(bloqueados.map((b) => b.business_id).filter(Boolean));
  const numerosBloqueados = new Set(bloqueados.map((b) => b.telefone).filter(Boolean));
  const jaNaFila = new Set(naFila.map((e) => e.numero));

  let candidatos: DestinatarioPronto[] = [];
  let invalidos = 0;

  if (pedido.origem === 'leads') {
    const linhas = ordenar(filtrar(await lerLinhasWhatsapp(db), pedido.filtros), 'score');
    for (const l of linhas) {
      if (l.pais !== 'PT' && l.pais !== 'BR') continue;
      if (l.contacto === 'nao_contactar' || negociosBloqueados.has(l.id)) {
        candidatos.push({
          numero: '',
          nome: '',
          pais: l.pais,
          businessId: l.id,
          texto: 'BLOQUEADO',
        });
        continue;
      }
      const numero = soDigitos(l.telefone);
      const base =
        pedido.modo === 'auto'
          ? mensagemDeAbertura({
              pais: l.pais,
              presenca: l.presenca,
              ramo: l.ramo,
              chave: l.id,
              saudacao: '{saudacao}',
            })
          : aplicarModelo(pedido.modelo, l.nome);
      candidatos.push({
        numero,
        nome: l.nome,
        pais: l.pais,
        businessId: l.id,
        texto: pedido.sair ? comLinhaParaSair(base, l.pais) : base,
      });
    }
  } else {
    const lidos = lerNumerosColados(pedido.colados, pedido.paisColados);
    invalidos = lidos.invalidos.length;
    candidatos = lidos.validos.map((d) => {
      const base = aplicarModelo(pedido.modelo, d.nome);
      return {
        ...d,
        businessId: null,
        texto: pedido.sair ? comLinhaParaSair(base, d.pais) : base,
      };
    });
  }

  let naoContactar = 0;
  let jaReceberam = 0;
  const vistos = new Set<string>();
  const passam: DestinatarioPronto[] = [];
  for (const c of candidatos) {
    if (c.texto === 'BLOQUEADO' || numerosBloqueados.has(c.numero)) {
      naoContactar++;
      continue;
    }
    if (jaNaFila.has(c.numero)) {
      jaReceberam++;
      continue;
    }
    if (vistos.has(c.numero)) continue;
    vistos.add(c.numero);
    passam.push(c);
  }

  return {
    destinatarios: passam.slice(0, pedido.maximo),
    naoContactar,
    jaReceberam,
    invalidos,
    foraDoMaximo: Math.max(0, passam.length - pedido.maximo),
    erro: passam.length === 0 ? 'Ninguém para receber com estas escolhas.' : null,
  };
}
