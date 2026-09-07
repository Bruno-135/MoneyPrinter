import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODEL,
  MODELS,
  MODEL_IDS,
  estimateCost,
  formatCost,
  isGenerationMode,
  isModelId,
} from './models';

describe('catálogo de modelos', () => {
  it('o modelo por omissão é o melhor, não o mais barato', () => {
    // Regra deliberada: baixar de modelo é decisão de quem paga, tomada no
    // ecrã. Se este teste falhar, alguém trocou o valor por omissão para
    // poupar — que é exatamente o que não se deve fazer por baixo.
    expect(DEFAULT_MODEL).toBe('claude-opus-5');
  });

  it('cada identificador bate certo com a chave do mapa', () => {
    for (const id of MODEL_IDS) {
      expect(MODELS[id].id).toBe(id);
    }
  });

  it('a saída custa sempre mais do que a entrada', () => {
    for (const id of MODEL_IDS) {
      expect(MODELS[id].price.output).toBeGreaterThan(MODELS[id].price.input);
    }
  });
});

describe('isModelId', () => {
  it('aceita os três da lista', () => {
    for (const id of MODEL_IDS) expect(isModelId(id)).toBe(true);
  });

  it('recusa qualquer outra coisa', () => {
    // O identificador vai numa chamada paga. Um valor vindo do formulário que
    // passasse daqui gastaria a chamada num erro — ou pediria um modelo mais
    // caro do que o escolhido.
    for (const value of ['claude-fable-5-1', 'gpt-4', '', null, undefined, 42, {}]) {
      expect(isModelId(value), String(value)).toBe(false);
    }
  });
});

describe('isGenerationMode', () => {
  it('aceita os dois modos e recusa o resto', () => {
    expect(isGenerationMode('fields')).toBe(true);
    expect(isGenerationMode('html')).toBe(true);
    expect(isGenerationMode('livre')).toBe(false);
    expect(isGenerationMode(null)).toBe(false);
  });
});

describe('estimateCost', () => {
  it('o modo HTML custa mais do que preencher campos, em todos os modelos', () => {
    for (const id of MODEL_IDS) {
      expect(estimateCost(id, 'html')).toBeGreaterThan(estimateCost(id, 'fields'));
    }
  });

  it('mantém a ordem de preço entre modelos', () => {
    expect(estimateCost('claude-opus-5', 'fields')).toBeGreaterThan(
      estimateCost('claude-sonnet-5', 'fields'),
    );
    expect(estimateCost('claude-sonnet-5', 'fields')).toBeGreaterThan(
      estimateCost('claude-haiku-4-5', 'fields'),
    );
  });

  it('bate certo com a conta feita à mão', () => {
    // Opus a preencher campos: 1500 entrada a 5 $/M + 1200 saída a 25 $/M.
    expect(estimateCost('claude-opus-5', 'fields')).toBeCloseTo(0.0375, 6);
  });
});

describe('formatCost', () => {
  it('escreve os cêntimos com vírgula', () => {
    expect(formatCost('claude-opus-5', 'fields')).toBe('≈ 3,8 cênt.');
  });

  it('não arredonda para zero o que custa menos de um cêntimo', () => {
    // "0 cênt." leria-se como grátis. Não é.
    expect(formatCost('claude-haiku-4-5', 'fields')).toBe('< 1 cênt.');
  });

  it('acima de dez cêntimos dispensa a casa decimal', () => {
    expect(formatCost('claude-opus-5', 'html')).toBe('≈ 21 cênt.');
  });
});
