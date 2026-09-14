import { describe, expect, it } from 'vitest';
import { escreverValor, lerValor, moedaDoPais } from './dinheiro';

/**
 * Quem regista uma venda está a fechar negócio, não a preencher um formulário.
 * Escreve o que lhe sai. O que não pode acontecer é 1.500 virar 1,50.
 */
describe('lerValor', () => {
  it('lê um número simples como euros inteiros', () => {
    expect(lerValor('30')).toBe(3000);
    expect(lerValor('1500')).toBe(150000);
  });

  it('aceita a vírgula decimal do português', () => {
    expect(lerValor('30,00')).toBe(3000);
    expect(lerValor('29,90')).toBe(2990);
  });

  it('aceita o ponto decimal de quem escreve à inglesa', () => {
    expect(lerValor('29.90')).toBe(2990);
  });

  it('não confunde milhares com cêntimos', () => {
    // O erro caro: 1.500 são mil e quinhentos, não um euro e meio. Três casas
    // atrás do separador nunca são cêntimos.
    expect(lerValor('1.500')).toBe(150000);
    expect(lerValor('1.500,00')).toBe(150000);
    expect(lerValor('1,500.00')).toBe(150000);
    expect(lerValor('12.000')).toBe(1200000);
  });

  it('completa uma casa decimal só', () => {
    // "30,5" são trinta euros e cinquenta cêntimos, não cinco.
    expect(lerValor('30,5')).toBe(3050);
  });

  it('ignora símbolos, espaços e o que não for número', () => {
    expect(lerValor('30 €')).toBe(3000);
    expect(lerValor('€30')).toBe(3000);
    expect(lerValor('R$ 1.500,00')).toBe(150000);
    expect(lerValor('  49,99 eur ')).toBe(4999);
  });

  it('distingue "não disse quanto" de "foi de graça"', () => {
    // null e 0 não são a mesma coisa: uma venda sem valor registado continua
    // a ser uma venda.
    expect(lerValor('')).toBeNull();
    expect(lerValor('   ')).toBeNull();
    expect(lerValor('grátis')).toBeNull();
    expect(lerValor('0')).toBe(0);
  });
});

describe('escreverValor', () => {
  it('escreve com a vírgula do português e o símbolo no sítio de cada país', () => {
    expect(escreverValor(3000, 'EUR')).toBe('30,00 €');
    expect(escreverValor(150000, 'BRL')).toBe('R$ 1500,00');
    expect(escreverValor(0, 'EUR')).toBe('0,00 €');
  });

  it('vai e volta sem perder cêntimos', () => {
    for (const centimos of [0, 1, 99, 3000, 2990, 150000]) {
      expect(lerValor(escreverValor(centimos, 'EUR')), String(centimos)).toBe(centimos);
    }
  });
});

describe('moedaDoPais', () => {
  it('dá euros em Portugal e reais no Brasil', () => {
    expect(moedaDoPais('PT')).toBe('EUR');
    expect(moedaDoPais('BR')).toBe('BRL');
    expect(moedaDoPais('br')).toBe('BRL');
    expect(moedaDoPais('ES')).toBe('EUR');
  });
});
