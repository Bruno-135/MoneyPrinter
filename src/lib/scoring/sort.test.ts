import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, SORTS, describeWhen, isProspectSort } from './sort';

describe('isProspectSort', () => {
  it('aceita as ordens que existem', () => {
    for (const sort of SORTS) {
      expect(isProspectSort(sort.value), sort.value).toBe(true);
    }
  });

  it('recusa tudo o resto', () => {
    // O valor vem do endereço, portanto vem de fora. Um valor inventado tem de
    // cair na ordem por omissão e não numa coluna que não existe.
    for (const lixo of ['preco', '', null, undefined, 42, 'score; drop table']) {
      expect(isProspectSort(lixo), String(lixo)).toBe(false);
    }
  });

  it('a ordem por omissão é uma das que existem', () => {
    expect(isProspectSort(DEFAULT_SORT)).toBe(true);
  });
});

describe('describeWhen', () => {
  const agora = new Date('2026-09-08T15:00:00Z');

  function haMinutos(minutos: number): string {
    return new Date(agora.getTime() - minutos * 60_000).toISOString();
  }

  it('responde à pergunta que se está mesmo a fazer', () => {
    expect(describeWhen(haMinutos(0.5), agora)).toBe('agora mesmo');
    expect(describeWhen(haMinutos(25), agora)).toBe('há 25 min');
    expect(describeWhen(haMinutos(60 * 3), agora)).toBe('há 3 h');
    expect(describeWhen(haMinutos(60 * 24), agora)).toBe('ontem');
    expect(describeWhen(haMinutos(60 * 24 * 5), agora)).toBe('há 5 dias');
  });

  it('acerta no singular e no plural do português', () => {
    expect(describeWhen(haMinutos(60 * 24 * 45), agora)).toBe('há 1 mês');
    expect(describeWhen(haMinutos(60 * 24 * 100), agora)).toBe('há 3 meses');
    expect(describeWhen(haMinutos(60 * 24 * 400), agora)).toBe('há 1 ano');
  });

  it('uma data no futuro é um relógio dessincronizado, não uma viagem no tempo', () => {
    // "há -3 minutos" seria pior do que não dizer nada.
    expect(describeWhen(new Date(agora.getTime() + 60_000).toISOString(), agora)).toBe('agora mesmo');
  });

  it('sem data, ou com lixo, não inventa nada', () => {
    expect(describeWhen(null, agora)).toBe('');
    expect(describeWhen('não é uma data', agora)).toBe('');
  });
});
