import { estadosDaEscolha, type EstadoDoContacto } from '@/lib/deals/contacto';

/**
 * A lista de WhatsApp: todos os leads com um número que provavelmente tem
 * WhatsApp, filtrados por país, ramo e score.
 *
 * Fica em memória e não em filtros da base de dados, e a razão é prática: cada
 * caixa de filtro mostra quantos leads apanha DENTRO dos outros filtros, e para
 * isso é preciso contar com um filtro de fora, cinco vezes. Com as linhas à mão
 * (umas milhares, só com as colunas que se mostram) isso são cinco ciclos sobre
 * um array, e a lista e as contagens não podem discordar porque usam a mesma
 * função. Se a base passar das dezenas de milhares, a conta muda — mas aí
 * muda-se aqui, num sítio só.
 *
 * «Tem WhatsApp» NÃO se sabe: nenhuma fonte que temos o diz. O que se sabe é o
 * tipo de número, e um telemóvel é o melhor palpite — quase toda a gente em PT
 * e no BR tem WhatsApp num telemóvel, e muito poucos fixos têm. É um palpite e
 * a página di-lo.
 */

export interface LinhaWhatsapp {
  id: string;
  nome: string;
  /** Slug do ramo. */
  ramo: string;
  pais: string;
  cidade: string | null;
  score: number;
  /** E.164, sempre presente: a lista só tem leads com telefone. */
  telefone: string;
  contacto: EstadoDoContacto;
  contactadoEm: string | null;
  adicionadoEm: string | null;
  /** O que tem online: decide que mensagem recebe (ver `mensagem.ts`). */
  presenca: 'none' | 'social_only' | 'real';
}

/**
 * Telemóvel, a partir do E.164.
 *
 *   PT  +351 9 [1236] ...    9 dígitos nacionais, a começar por 91, 92, 93 ou 96
 *   BR  +55 DD 9 ........    código de área, e o nono dígito que só os móveis têm
 */
export function ehMovel(e164: string | null | undefined): boolean {
  if (!e164) return false;
  return /^\+3519[1236]\d{7}$/.test(e164) || /^\+55[1-9][1-9]9\d{8}$/.test(e164);
}

export const FAIXAS_DE_SCORE = [
  { value: 'muito_quente', label: 'Muito quente (90+)', min: 90, max: Infinity },
  { value: 'quente', label: 'Quente (75–89)', min: 75, max: 90 },
  { value: 'morno', label: 'Morno (60–74)', min: 60, max: 75 },
  { value: 'frio', label: 'Frio (abaixo de 60)', min: -Infinity, max: 60 },
] as const;

export type FaixaDeScore = (typeof FAIXAS_DE_SCORE)[number]['value'];

export function ehFaixaDeScore(valor: unknown): valor is FaixaDeScore {
  return FAIXAS_DE_SCORE.some((f) => f.value === valor);
}

export function faixaDoScore(score: number): FaixaDeScore {
  return FAIXAS_DE_SCORE.find((f) => score >= f.min && score < f.max)!.value;
}

export type TipoDeNumero = 'movel' | 'todos';

export interface Filtros {
  /** 'PT', 'BR' ou vazio (todos). */
  pais: string;
  /** Slug do ramo, ou vazio. */
  ramo: string;
  faixa: FaixaDeScore | '';
  /** Uma escolha de contacto ('por', 'ja', ...), ou vazio. */
  contacto: string;
  numero: TipoDeNumero;
}

export type CampoDeFiltro = keyof Filtros;

export const SEM_FILTROS: Filtros = {
  pais: '',
  ramo: '',
  faixa: '',
  contacto: '',
  numero: 'movel',
};

function serve(l: LinhaWhatsapp, f: Filtros, ignorar?: CampoDeFiltro): boolean {
  if (ignorar !== 'numero' && f.numero === 'movel' && !ehMovel(l.telefone)) return false;
  if (ignorar !== 'pais' && f.pais && l.pais !== f.pais) return false;
  if (ignorar !== 'ramo' && f.ramo && l.ramo !== f.ramo) return false;
  if (ignorar !== 'faixa' && f.faixa && faixaDoScore(l.score) !== f.faixa) return false;
  if (ignorar !== 'contacto' && f.contacto) {
    const estados = estadosDaEscolha(f.contacto);
    if (estados.length > 0 && !estados.includes(l.contacto)) return false;
  }
  return true;
}

/** As linhas que passam os filtros. `ignorar` deixa um filtro de fora (para as contagens). */
export function filtrar(
  linhas: readonly LinhaWhatsapp[],
  filtros: Filtros,
  ignorar?: CampoDeFiltro,
): LinhaWhatsapp[] {
  return linhas.filter((l) => serve(l, filtros, ignorar));
}

export type Ordem = 'score' | 'nome' | 'novos';

export function ordenar(linhas: readonly LinhaWhatsapp[], ordem: Ordem): LinhaWhatsapp[] {
  const copia = [...linhas];
  const porNome = (a: LinhaWhatsapp, b: LinhaWhatsapp) => a.nome.localeCompare(b.nome, 'pt');
  switch (ordem) {
    case 'nome':
      return copia.sort(porNome);
    case 'novos':
      return copia.sort(
        (a, b) => (b.adicionadoEm ?? '').localeCompare(a.adicionadoEm ?? '') || porNome(a, b),
      );
    case 'score':
      return copia.sort((a, b) => b.score - a.score || porNome(a, b));
  }
}

/**
 * Quantos leads tem cada opção de um filtro, com os OUTROS filtros aplicados e
 * o dele de fora: é assim que se pode trocar de opção sem ficar preso na que
 * se escolheu.
 */
export function contar(
  linhas: readonly LinhaWhatsapp[],
  filtros: Filtros,
  campo: Exclude<CampoDeFiltro, 'numero'>,
): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const l of filtrar(linhas, filtros, campo)) {
    const chave =
      campo === 'pais'
        ? l.pais
        : campo === 'ramo'
          ? l.ramo
          : campo === 'faixa'
            ? faixaDoScore(l.score)
            : l.contacto;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return contagem;
}

/** Móveis e total, para a caixa «tipo de número». */
export function contarNumeros(
  linhas: readonly LinhaWhatsapp[],
  filtros: Filtros,
): { movel: number; todos: number } {
  const todos = filtrar(linhas, filtros, 'numero');
  return { movel: todos.filter((l) => ehMovel(l.telefone)).length, todos: todos.length };
}
