import type { EstadoDoContacto } from '@/lib/deals/contacto';
import { ehMovel } from '@/lib/whatsapp/lista';

/**
 * Um lead em forma de cartão: o que se mostra na vista «Cartões» da lista de
 * Leads e da Lista de WhatsApp.
 *
 * As duas páginas leem os leads de maneiras diferentes (uma ordenada e paginada
 * na base, a outra toda em memória), por isso cada uma traduz o que tem para
 * esta forma, e o cartão é um só.
 */
export interface CartaoDeLead {
  id: string;
  nome: string;
  /** Slug do ramo. */
  ramo: string;
  cidade: string | null;
  pais: string;
  score: number;
  /** Nota no Google, de 1 a 5. */
  nota: number | null;
  avaliacoes: number | null;
  presenca: 'none' | 'social_only' | 'real';
  /** E.164, quando há. */
  telefone: string | null;
  contacto: EstadoDoContacto;
  contactadoEm: string | null;
}

/** A partir de quantas avaliações um comércio conta como «movimentado». */
const MOVIMENTADO = 100;

/**
 * Porque é que este lead vale a pena, numa linha.
 *
 * Feita dos dados e não do texto da pontuação: as razões do score são frases
 * para explicar a nota, compridas demais para um cartão. Aqui é o que se diz
 * de relance — «Não tem site · telemóvel (WhatsApp) · movimentado: 3.052
 * avaliações».
 */
export function porqueDoLead(c: CartaoDeLead): string {
  const partes: string[] = [];

  if (c.presenca === 'none') partes.push('Não tem site');
  else if (c.presenca === 'social_only') partes.push('Só tem redes sociais');
  else partes.push('Já tem site');

  if (ehMovel(c.telefone)) partes.push('telemóvel (WhatsApp)');
  else if (c.telefone) partes.push('telefone fixo');

  if (c.avaliacoes !== null && c.avaliacoes >= MOVIMENTADO) {
    partes.push(`movimentado: ${milhares(c.avaliacoes)} avaliações`);
  }
  if (c.nota !== null && c.nota >= 4.5 && (c.avaliacoes ?? 0) >= 10) {
    partes.push(`bem avaliado: nota ${c.nota.toFixed(1).replace('.', ',')}`);
  }

  return partes.join(' · ');
}

/**
 * 3052 → «3.052». À mão: o `toLocaleString('pt-PT')` não separa os milhares
 * abaixo de 10 000 e, conforme o motor, usa um espaço fino em vez do ponto.
 */
function milhares(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
