import { describe, expect, it } from 'vitest';
import { STAGES, isValidStage, openStages, stageDefinition, stageLabel, STAGE_STYLE } from './stages';

describe('STAGES', () => {
  it('cobre os oito estados do funil', () => {
    expect(STAGES).toHaveLength(8);
  });

  it('começa em "por contactar" — é onde tudo entra', () => {
    expect(STAGES[0]?.value).toBe('new');
  });

  it('trata ganho, perdido e em pausa como fora do funil', () => {
    const closed = STAGES.filter((s) => !s.open).map((s) => s.value);
    expect(closed.sort()).toEqual(['lost', 'on_hold', 'won']);
  });

  it('tem uma cor definida para cada estado', () => {
    for (const stage of STAGES) {
      expect(STAGE_STYLE[stage.value]).toBeTruthy();
    }
  });

  it('explica cada estado por palavras', () => {
    for (const stage of STAGES) {
      expect(stage.hint.length).toBeGreaterThan(10);
    }
  });
});

describe('stageLabel', () => {
  it('traduz os estados', () => {
    expect(stageLabel('contacted')).toBe('Contactado');
    expect(stageLabel('won')).toBe('Ganho');
  });

  it('um comércio sem negociação conta como por contactar', () => {
    // É esta a regra que evita criar 111 linhas vazias a cada varrimento.
    expect(stageLabel(null)).toBe('Por contactar');
    expect(stageLabel(undefined)).toBe('Por contactar');
  });
});

describe('isValidStage', () => {
  it('aceita os estados reais e recusa o resto', () => {
    expect(isValidStage('negotiating')).toBe(true);
    expect(isValidStage('inventado')).toBe(false);
    expect(isValidStage('')).toBe(false);
  });
});

describe('openStages', () => {
  it('devolve só os que ainda estão em jogo', () => {
    expect(openStages()).toEqual(['new', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiating']);
  });
});

describe('stageDefinition', () => {
  it('nunca devolve indefinido, mesmo com lixo à entrada', () => {
    expect(stageDefinition(null).value).toBe('new');
  });
});
