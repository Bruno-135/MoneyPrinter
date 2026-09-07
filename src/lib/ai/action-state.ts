/**
 * Estado da ação de geração.
 *
 * Vive fora do ficheiro `'use server'` porque um módulo de ações do servidor só
 * pode exportar funções assíncronas — uma constante ali dentro faz a compilação
 * falhar. O tipo e o valor inicial são precisos dos dois lados, servidor e
 * cliente, e é por isso que ficam num sítio neutro.
 */
export interface AiActionState {
  ok: boolean;
  message: string;
  /** O que fazer a seguir, quando há alguma coisa a fazer. */
  hint?: string;
}

export const AI_IDLE: AiActionState = { ok: true, message: '' };
