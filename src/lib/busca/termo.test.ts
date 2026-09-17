import { describe, expect, it } from 'vitest';
import { normalizar, paraLike, prepararTermo, soDigitos } from './termo';

describe('normalizar', () => {
  it('tira os acentos e baixa as maiúsculas', () => {
    expect(normalizar('Ançã')).toBe('anca');
    expect(normalizar('PADARIA')).toBe('padaria');
    expect(normalizar('São João')).toBe('sao joao');
    expect(normalizar('Münich Bar')).toBe('munich bar');
  });

  it('deixa em paz o que não tem acento', () => {
    expect(normalizar('bonfim')).toBe('bonfim');
  });

  it('faz o mesmo que o SQL faz, para o alfabeto português', () => {
    // Os pares vêm da migração 0030. Se um deles falhar, as duas
    // normalizações divergiram e a procura deixa de encontrar.
    expect(normalizar('áàâãä')).toBe('aaaaa');
    expect(normalizar('éèêë')).toBe('eeee');
    expect(normalizar('íìîï')).toBe('iiii');
    expect(normalizar('óòôõö')).toBe('ooooo');
    expect(normalizar('úùûü')).toBe('uuuu');
    expect(normalizar('çñ')).toBe('cn');
  });
});

describe('paraLike', () => {
  it('escapa os curingas do LIKE', () => {
    expect(paraLike('100%')).toBe('100\\%');
    expect(paraLike('a_b')).toBe('a\\_b');
    expect(paraLike('c\\d')).toBe('c\\\\d');
  });

  it('procurar "%" sozinho não traz a base de dados inteira', () => {
    expect(paraLike('%')).toBe('\\%');
  });
});

describe('soDigitos', () => {
  it('reduz qualquer forma de telefone a algarismos', () => {
    expect(soDigitos('912 345 678')).toBe('912345678');
    expect(soDigitos('+351 912 345 678')).toBe('351912345678');
    expect(soDigitos('(11) 98765-4321')).toBe('11987654321');
  });
});

describe('prepararTermo', () => {
  it('recusa termos curtos de mais', () => {
    expect(prepararTermo('')).toBeNull();
    expect(prepararTermo(' ')).toBeNull();
    expect(prepararTermo('a')).toBeNull();
  });

  it('aceita dois caracteres', () => {
    expect(prepararTermo('za')).toBe('za');
  });

  it('um telefone com espaços vira algarismos seguidos', () => {
    expect(prepararTermo('912 345 678')).toBe('912345678');
    expect(prepararTermo('+351 912 345 678')).toBe('351912345678');
  });

  it('um nome com números continua a ser um nome', () => {
    // "Café 24" tem algarismos mas não é telefone: tem letras pelo meio.
    expect(prepararTermo('Café 24')).toBe('cafe 24');
  });

  it('uma referência de cliente passa em minúsculas', () => {
    expect(prepararTermo('CLI-0042')).toBe('cli-0042');
  });

  it('um nome com acentos fica normalizado', () => {
    expect(prepararTermo('Padaria Ançã')).toBe('padaria anca');
  });
});
