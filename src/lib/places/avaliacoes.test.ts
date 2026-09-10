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
        photoUri: 'https://lh3.googleusercontent.com/a/maria',
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

  it('traz a cara de quem escreveu, que é o que faz parecer uma pessoa', () => {
    const [a] = lerAvaliacoes(bruto);
    expect(a?.autorFoto).toBe('https://lh3.googleusercontent.com/a/maria');
  });

  it('sem cara, fica nulo em vez de indefinido', () => {
    const [a] = lerAvaliacoes([{ text: { text: 'Bom' } }]);
    expect(a?.autorFoto).toBeNull();
  });

  it('aguenta lixo sem rebentar', () => {
    expect(lerAvaliacoes(null)).toEqual([]);
    expect(lerAvaliacoes('nada')).toEqual([]);
  });
});

describe('lerAvaliacoes — traduções', () => {
  it('marca como traduzida quando o idioma mostrado não é o original', () => {
    const [a] = lerAvaliacoes([
      {
        text: { text: 'Excelente clínica', languageCode: 'pt' },
        originalText: { text: 'Excellent clinic', languageCode: 'en' },
      },
    ]);
    expect(a?.traduzida).toBe(true);
    expect(a?.texto).toBe('Excelente clínica');
  });

  it('não marca quando a pessoa escreveu na própria língua', () => {
    const [a] = lerAvaliacoes([
      {
        text: { text: 'Excelente clínica', languageCode: 'pt' },
        originalText: { text: 'Excelente clínica', languageCode: 'pt' },
      },
    ]);
    expect(a?.traduzida).toBe(false);
  });

  it('sem informação de idioma, não inventa que é tradução', () => {
    const [a] = lerAvaliacoes([{ text: { text: 'Bom' } }]);
    expect(a?.traduzida).toBe(false);
  });
});
