import { describe, expect, it } from 'vitest';
import { PAISES, ehCodigoPais, nomeDoPais } from './paises';

describe('nomeDoPais', () => {
  it('escreve por extenso os países onde se prospeta', () => {
    expect(nomeDoPais('PT')).toBe('Portugal');
    expect(nomeDoPais('BR')).toBe('Brasil');
  });

  it('aceita o código em minúsculas', () => {
    expect(nomeDoPais('pt')).toBe('Portugal');
  });

  it('devolve o código quando não conhece o país', () => {
    // De propósito: mais vale ver um 'ES' na lista do que vê-lo convertido
    // em Portugal sem ninguém dar por isso.
    expect(nomeDoPais('ES')).toBe('ES');
  });
});

describe('ehCodigoPais', () => {
  it('reconhece os códigos conhecidos e recusa o resto', () => {
    expect(ehCodigoPais('PT')).toBe(true);
    expect(ehCodigoPais('BR')).toBe(true);
    expect(ehCodigoPais('pt')).toBe(false);
    expect(ehCodigoPais('ES')).toBe(false);
    expect(ehCodigoPais(null)).toBe(false);
  });

  it('cobre todos os países da tabela', () => {
    for (const codigo of Object.keys(PAISES)) expect(ehCodigoPais(codigo)).toBe(true);
  });
});
