import { describe, expect, it } from 'vitest';
import { lerAvaliacoes } from './avaliacoes';

describe('lerAvaliacoes', () => {
  const bruto = [
    {
      rating: 5,
      relativePublishTimeDescription: 'há 2 meses',
      text: { text: '  Fui lá às sete e o pão estava quente.  ', languageCode: 'pt' },
      authorAttribution: {
        displayName: 'Maria Costa',
        uri: 'https://www.google.com/maps/contrib/456/reviews',
      },
    },
  ];

  it('guarda o texto tal e qual, só sem os espaços das pontas', () => {
    const [a] = lerAvaliacoes(bruto);
    expect(a?.texto).toBe('Fui lá às sete e o pão estava quente.');
  });

  it('traz o autor, a nota e a data como a Google as escreve', () => {
    const [a] = lerAvaliacoes(bruto);
    expect(a?.autor).toBe('Maria Costa');
    expect(a?.nota).toBe(5);
    expect(a?.quando).toBe('há 2 meses');
    expect(a?.autorUrl).toContain('google.com');
  });

  it('deita fora avaliações sem texto — na página não dizem nada', () => {
    expect(lerAvaliacoes([{ rating: 5 }, { text: { text: '   ' } }, ...bruto])).toHaveLength(1);
  });

  it('usa o texto original quando não há tradução', () => {
    const [a] = lerAvaliacoes([{ originalText: { text: 'Muito bom' } }]);
    expect(a?.texto).toBe('Muito bom');
  });

  it('aguenta lixo sem rebentar', () => {
    expect(lerAvaliacoes(null)).toEqual([]);
    expect(lerAvaliacoes('nada')).toEqual([]);
  });
});
