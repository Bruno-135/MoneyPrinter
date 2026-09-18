import { describe, expect, it } from 'vitest';
import { lerPreco, lerTamanhos } from './campos';

describe('lerPreco', () => {
  it('aceita as formas que uma pessoa escreve', () => {
    expect(lerPreco('48')).toBe(4800);
    expect(lerPreco('48,00')).toBe(4800);
    expect(lerPreco('48.00')).toBe(4800);
    expect(lerPreco('48 €')).toBe(4800);
    expect(lerPreco(' 48,5 ')).toBe(4850);
  });

  it('três algarismos depois do ponto são MILHARES, não cêntimos', () => {
    // "1.500" é mil e quinhentos euros, não um euro e meio. Foi por isto que
    // a conversão não podia ser um split pelo ponto.
    expect(lerPreco('1.500')).toBe(150000);
    expect(lerPreco('1.500,00')).toBe(150000);
    expect(lerPreco('1 500,50')).toBe(150050);
  });

  it('vazio é vazio, e não zero', () => {
    // Uma peça sem preço posto não é uma peça grátis.
    expect(lerPreco('')).toBeNull();
    expect(lerPreco('   ')).toBeNull();
    expect(lerPreco('€')).toBeNull();
  });

  it('zero é zero', () => {
    expect(lerPreco('0')).toBe(0);
  });
});

describe('lerTamanhos', () => {
  it('aceita vírgulas, barras e pontos e vírgula', () => {
    expect(lerTamanhos('S, M, L')).toEqual(['S', 'M', 'L']);
    expect(lerTamanhos('38/40/42')).toEqual(['38', '40', '42']);
    expect(lerTamanhos('S; M; L')).toEqual(['S', 'M', 'L']);
  });

  it('não parte um tamanho que tenha espaço', () => {
    expect(lerTamanhos('único, M largo')).toEqual(['único', 'M largo']);
  });

  it('deita fora o vazio', () => {
    expect(lerTamanhos('S,,M,')).toEqual(['S', 'M']);
    expect(lerTamanhos('')).toEqual([]);
  });
});
