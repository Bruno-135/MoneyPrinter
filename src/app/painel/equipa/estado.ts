/**
 * O estado do formulário de criar uma pessoa.
 *
 * Num ficheiro à parte porque um ficheiro `'use server'` só pode exportar
 * funções assíncronas — um objecto exportado de lá faz o build falhar, e a
 * mensagem («found object») não diz qual.
 */

export interface EstadoDoConvite {
  fase: 'parado' | 'feito' | 'erro';
  mensagem: string | null;
}

export const CONVITE_PARADO: EstadoDoConvite = { fase: 'parado', mensagem: null };
