import { describe, expect, it } from 'vitest';
import { lerMensagens } from './repository';

/**
 * O que interessa aqui é nunca rebentar a ficha do comércio por causa de uma
 * linha estragada. A coluna é `jsonb` e aceita tudo; o que sai desta função tem
 * de ser utilizável sem mais verificações.
 */
describe('lerMensagens', () => {
  it('lê a forma normal', () => {
    expect(lerMensagens([{ angulo: 'avaliações', texto: 'Bom dia…' }])).toEqual([
      { angulo: 'avaliações', texto: 'Bom dia…' },
    ]);
  });

  it('devolve lista vazia para tudo o que não seja uma lista', () => {
    for (const lixo of [null, undefined, {}, 'texto', 42, true]) {
      expect(lerMensagens(lixo)).toEqual([]);
    }
  });

  it('deita fora as entradas sem texto e fica com as boas', () => {
    const lido = lerMensagens([
      { angulo: 'a', texto: 'vale' },
      { angulo: 'b' },
      { angulo: 'c', texto: '   ' },
      null,
      'solta',
      { angulo: 'd', texto: 'também vale' },
    ]);
    expect(lido).toEqual([
      { angulo: 'a', texto: 'vale' },
      { angulo: 'd', texto: 'também vale' },
    ]);
  });

  it('aceita uma mensagem sem ângulo', () => {
    // O ângulo é uma etiqueta para quem escolhe; o texto é que é a mensagem.
    // Faltar a etiqueta não é razão para deitar fora a mensagem.
    expect(lerMensagens([{ texto: 'Bom dia…' }])).toEqual([{ angulo: '', texto: 'Bom dia…' }]);
  });
});
