import { describe, expect, it } from 'vitest';
import { regionSearchKey } from './region-key';

/**
 * Os dois primeiros testes são as chaves REAIS de duas linhas que estão na base
 * de dados, copiadas da coluna gerada. Se esta função e o Postgres alguma vez
 * discordarem, é aqui que se vê — e discordarem significa procurar uma linha
 * que existe, não a encontrar, e tentar criar outra igual que a restrição única
 * recusa.
 */

describe('regionSearchKey', () => {
  it('bate certo com a chave que a base de dados gerou para Braga · padaria', () => {
    expect(
      regionSearchKey({
        countryCode: 'PT',
        locality: 'Braga',
        latitude: 41.5454,
        longitude: -8.4265,
        radiusMeters: 2000,
        category: 'padaria',
      }),
    ).toBe('pt|braga|41.5454|-8.4265|2000|padaria');
  });

  it('bate certo com a chave que a base de dados gerou para o outro varrimento', () => {
    expect(
      regionSearchKey({
        countryCode: 'PT',
        locality: 'Porto',
        latitude: 41.5454,
        longitude: -8.4265,
        radiusMeters: 2000,
        category: 'cabeleireiro',
      }),
    ).toBe('pt|porto|41.5454|-8.4265|2000|cabeleireiro');
  });

  it('mantém as quatro casas decimais, como o round() do Postgres', () => {
    // Um `Math.round` daria "41.54" e a linha nunca seria encontrada.
    expect(
      regionSearchKey({
        countryCode: 'PT',
        locality: 'X',
        latitude: 41.54,
        longitude: -8.4,
        radiusMeters: 2000,
        category: 'padaria',
      }),
    ).toBe('pt|x|41.5400|-8.4000|2000|padaria');
  });

  it('normaliza maiúsculas e espaços, como a base de dados', () => {
    expect(
      regionSearchKey({
        countryCode: ' pt ',
        locality: '  BRAGA  ',
        latitude: 41.5454,
        longitude: -8.4265,
        radiusMeters: 2000,
        category: ' Padaria ',
      }),
    ).toBe('pt|braga|41.5454|-8.4265|2000|padaria');
  });

  it('sem localidade, o campo fica vazio e não "null"', () => {
    expect(
      regionSearchKey({
        countryCode: 'PT',
        locality: null,
        latitude: 41.5454,
        longitude: -8.4265,
        radiusMeters: 2000,
        category: 'padaria',
      }),
    ).toBe('pt||41.5454|-8.4265|2000|padaria');
  });

  it('cidades diferentes com o mesmo ramo dão chaves diferentes', () => {
    // Este é o bug que a função existe para travar: eram a mesma linha.
    const braga = regionSearchKey({
      countryCode: 'PT',
      locality: 'Braga',
      latitude: 41.5454,
      longitude: -8.4265,
      radiusMeters: 2000,
      category: 'padaria',
    });
    const porto = regionSearchKey({
      countryCode: 'PT',
      locality: 'Porto',
      latitude: 41.1579,
      longitude: -8.6291,
      radiusMeters: 2000,
      category: 'padaria',
    });

    expect(braga).not.toBe(porto);
  });

  it('a mesma cidade com ramos diferentes dá chaves diferentes', () => {
    const padaria = regionSearchKey({
      countryCode: 'PT',
      locality: 'Braga',
      latitude: 41.5454,
      longitude: -8.4265,
      radiusMeters: 2000,
      category: 'padaria',
    });
    const cabeleireiro = regionSearchKey({
      countryCode: 'PT',
      locality: 'Braga',
      latitude: 41.5454,
      longitude: -8.4265,
      radiusMeters: 2000,
      category: 'cabeleireiro',
    });

    expect(padaria).not.toBe(cabeleireiro);
  });
});
