/**
 * Modelos disponíveis no ecrã de geração.
 *
 * A lista é fechada de propósito. O identificador do modelo vai numa chamada
 * paga: aceitar o que vier do formulário deixaria alguém pedir um modelo caro
 * — ou inexistente, gastando a chamada num erro. Só passam os três daqui.
 *
 * O Opus é o valor por omissão e é assim que fica. Baixar de modelo para
 * poupar é uma decisão de quem paga a conta, tomada no momento, com o preço à
 * frente dos olhos — não uma otimização silenciosa feita por baixo.
 */

export const MODEL_IDS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'] as const;
export type ModelId = (typeof MODEL_IDS)[number];

export const DEFAULT_MODEL: ModelId = 'claude-opus-5';

export interface ModelDefinition {
  id: ModelId;
  label: string;
  /** Uma frase sobre quando escolher este. */
  suits: string;
  /** Dólares por milhão de tokens. */
  price: { input: number; output: number };
}

export const MODELS: Record<ModelId, ModelDefinition> = {
  'claude-opus-5': {
    id: 'claude-opus-5',
    label: 'Opus 5',
    suits: 'o melhor. Para um cliente que está mesmo a pagar.',
    price: { input: 5, output: 25 },
  },
  'claude-sonnet-5': {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    suits: 'bom e a menos de metade do preço. Para gerar vários de seguida.',
    price: { input: 2, output: 10 },
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    suits: 'o mais rápido e barato. Para encher a lista e ver depois.',
    price: { input: 1, output: 5 },
  },
};

/** Os dois caminhos de geração. */
export const GENERATION_MODES = ['fields', 'html'] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

/**
 * Estimativa de tokens por modo, para mostrar o preço antes de se carregar.
 *
 * São médias medidas nos pedidos que este código faz, não um limite. Servem
 * para a diferença entre 4 cêntimos e 21 estar à vista na hora de escolher —
 * um número aproximado à frente dos olhos vale mais do que um número exato
 * numa fatura no fim do mês.
 */
const TOKENS: Record<GenerationMode, { input: number; output: number }> = {
  fields: { input: 1500, output: 1200 },
  html: { input: 2000, output: 8000 },
};

/** Custo estimado de uma geração, em dólares. */
export function estimateCost(model: ModelId, mode: GenerationMode): number {
  const { price } = MODELS[model];
  const tokens = TOKENS[mode];

  return (tokens.input * price.input + tokens.output * price.output) / 1_000_000;
}

/** O mesmo, escrito para aparecer no ecrã ("≈ 4 cênt."). */
export function formatCost(model: ModelId, mode: GenerationMode): string {
  const cents = estimateCost(model, mode) * 100;

  // Abaixo de um cêntimo, "0 cênt." leria-se como grátis, que não é verdade.
  if (cents < 1) return '< 1 cênt.';

  return `≈ ${cents.toFixed(cents < 10 ? 1 : 0).replace('.', ',')} cênt.`;
}

export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && (MODEL_IDS as readonly string[]).includes(value);
}

export function isGenerationMode(value: unknown): value is GenerationMode {
  return typeof value === 'string' && (GENERATION_MODES as readonly string[]).includes(value);
}
