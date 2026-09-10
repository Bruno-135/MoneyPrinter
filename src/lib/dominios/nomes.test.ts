import { describe, expect, it } from 'vitest';
import { candidatos, etiqueta, extensoes, palavrasUteis } from './nomes';

describe('etiqueta', () => {
  it('tira acentos, maiúsculas e pontuação', () => {
    expect(etiqueta('Pastelaria São João')).toBe('pastelariasaojoao');
  });

  it('junta com hífenes quando se pede', () => {
    expect(etiqueta('Comfort Cakes Porto', { comHifen: true })).toBe('comfort-cakes-porto');
  });

  it('lê o & como "e", que é como se diz', () => {
    expect(etiqueta('Pão & Companhia')).toBe('paoecompanhia');
  });

  it('nunca passa o limite de 63 caracteres de uma parte de domínio', () => {
    expect(etiqueta('a'.repeat(100)).length).toBe(63);
  });

  it('não deixa hífenes nas pontas, que nenhum registo aceita', () => {
    expect(etiqueta('-- Casa do Forno --', { comHifen: true })).toBe('casa-do-forno');
  });
});

describe('palavrasUteis', () => {
  it('deita fora as formas jurídicas e as ligações', () => {
    expect(palavrasUteis('Padaria Jamor, Lda.')).toEqual(['padaria', 'jamor']);
    expect(palavrasUteis('Casa do Forno')).toEqual(['casa', 'forno']);
  });
});

describe('candidatos', () => {
  it('começa pelo nome tal e qual, que é o que o dono quer ouvir', () => {
    const lista = candidatos({ nome: 'Padaria Jamor', locality: 'Porto', ramo: 'Padaria' });
    expect(lista[0]).toBe('padariajamor');
  });

  it('dá alternativas com a cidade para quando o óbvio estiver ocupado', () => {
    const lista = candidatos({ nome: 'Padaria Jamor', locality: 'Porto' });
    expect(lista).toContain('padariajamorporto');
    expect(lista).toContain('jamorporto');
  });

  it('propõe o nome curto: muita gente conhece a "Jamor", não a "Padaria Jamor"', () => {
    expect(candidatos({ nome: 'Padaria Jamor' })).toContain('jamor');
  });

  it('não repete a cidade quando ela já está no nome', () => {
    const lista = candidatos({ nome: 'Comfort Cakes Porto', locality: 'Porto' });
    expect(lista).not.toContain('comfortcakesportoporto');
  });

  it('não devolve repetidos nem coisas curtas de mais', () => {
    const lista = candidatos({ nome: 'Ka' });
    expect(lista).toEqual([]);
    expect(new Set(candidatos({ nome: 'Casa do Forno' })).size).toBe(
      candidatos({ nome: 'Casa do Forno' }).length,
    );
  });

  it('um nome só de pontuação não dá candidato nenhum, em vez de dar lixo', () => {
    expect(candidatos({ nome: '!!! ---' })).toEqual([]);
  });
});

describe('extensoes', () => {
  it('põe a do país à frente', () => {
    expect(extensoes('PT')[0]).toBe('pt');
    expect(extensoes('BR')[0]).toBe('com.br');
  });

  it('um país desconhecido leva as internacionais', () => {
    expect(extensoes(null)).toEqual(['com', 'net', 'online']);
  });
});
