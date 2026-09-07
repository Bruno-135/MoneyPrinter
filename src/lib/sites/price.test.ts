import { describe, expect, it } from 'vitest';
import { formatPrice, parsePrice } from './repository';

describe('parsePrice — o que as pessoas escrevem mesmo', () => {
  it('aceita vírgula decimal, que é como se escreve em Portugal', () => {
    expect(parsePrice('1,90')).toBe(190);
  });
  it('aceita ponto decimal', () => {
    expect(parsePrice('1.90')).toBe(190);
  });
  it('aceita inteiros', () => {
    expect(parsePrice('2')).toBe(200);
  });
  it('ignora o símbolo da moeda e espaços', () => {
    expect(parsePrice(' € 3,50 ')).toBe(350);
    expect(parsePrice('R$ 12,00')).toBe(1200);
  });
  it('arredonda ao cêntimo em vez de guardar uma fração impossível', () => {
    expect(parsePrice('1,999')).toBe(200);
  });
  it('devolve null para vazio ou lixo, em vez de um item a custar zero', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('   ')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('€')).toBeNull();
    expect(parsePrice('grátis')).toBeNull();
  });

  it('mas um zero escrito de propósito vale zero', () => {
    expect(parsePrice('0')).toBe(0);
    expect(parsePrice('0,00')).toBe(0);
  });
});

describe('formatPrice', () => {
  it('formata em euros', () => {
    expect(formatPrice(190, 'EUR')).toMatch(/1,90/);
  });
  it('formata em reais', () => {
    expect(formatPrice(1200, 'BRL')).toMatch(/12,00/);
  });
  it('não mostra nada quando não há preço', () => {
    expect(formatPrice(null, 'EUR')).toBe('');
  });
});
