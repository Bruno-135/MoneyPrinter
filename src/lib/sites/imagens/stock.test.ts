import { describe, expect, it } from 'vitest';
import { chaveConsulta, creditoDe, mapearPexels, type FotoStock } from './stock';
import { consultaParaSeccao, consultasParaRamo } from './consultas';

describe('chaveConsulta', () => {
  it('junta duas maneiras de escrever a mesma pergunta', () => {
    expect(chaveConsulta('Bakery  Bread', 'landscape')).toBe(
      chaveConsulta(' bakery bread ', 'landscape'),
    );
  });

  it('tira acentos', () => {
    expect(chaveConsulta('padaria pão', 'landscape')).toBe('padaria pao|landscape');
  });

  it('separa por orientação, porque a resposta é outra', () => {
    expect(chaveConsulta('bakery', 'landscape')).not.toBe(chaveConsulta('bakery', 'portrait'));
  });
});

describe('mapearPexels', () => {
  const payload = {
    photos: [
      {
        id: 4108,
        width: 4000,
        height: 2670,
        url: 'https://www.pexels.com/photo/pao-4108/',
        photographer: 'Ana Silva',
        photographer_url: 'https://www.pexels.com/@ana',
        avg_color: '#7A5230',
        alt: 'Pão acabado de sair do forno',
        src: {
          large2x: 'https://images.pexels.com/photos/4108/pao-large2x.jpg',
          large: 'https://images.pexels.com/photos/4108/pao-large.jpg',
          medium: 'https://images.pexels.com/photos/4108/pao-medium.jpg',
          tiny: 'https://images.pexels.com/photos/4108/pao-tiny.jpg',
        },
      },
    ],
  };

  it('guarda o autor e a origem — sem eles não se pode cumprir a licença', () => {
    const [foto] = mapearPexels(payload);
    expect(foto?.autor).toBe('Ana Silva');
    expect(foto?.autorUrl).toBe('https://www.pexels.com/@ana');
    expect(foto?.origem).toBe('https://www.pexels.com/photo/pao-4108/');
  });

  it('escolhe o ficheiro grande para a página e o médio para a miniatura', () => {
    const [foto] = mapearPexels(payload);
    expect(foto?.url).toContain('large2x');
    expect(foto?.miniatura).toContain('medium');
  });

  it('deita fora fotos sem ficheiro utilizável em vez de as deixar partir a página', () => {
    expect(mapearPexels({ photos: [{ id: 1, src: {} }] })).toHaveLength(0);
  });

  it('aguenta uma resposta com outra forma sem rebentar', () => {
    expect(mapearPexels(null)).toEqual([]);
    expect(mapearPexels({})).toEqual([]);
    expect(mapearPexels({ photos: 'nada disto' })).toEqual([]);
  });

  it('põe uma cor válida mesmo quando o banco manda lixo', () => {
    const [foto] = mapearPexels({
      photos: [{ id: 2, avg_color: 'castanho', src: { large: 'x.jpg' } }],
    });
    expect(foto?.cor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('creditoDe', () => {
  it('diz o nome e o banco', () => {
    const foto = { autor: 'Ana Silva' } as FotoStock;
    expect(creditoDe(foto)).toBe('Foto de Ana Silva · Pexels');
  });
});

describe('consultas por ramo', () => {
  it('pede coisas diferentes para lugares diferentes da página', () => {
    const c = consultasParaRamo('padaria');
    expect(new Set([c.capa, c.interior, c.detalhe]).size).toBe(3);
  });

  it('manda o hero para a vista larga e os produtos para o grande plano', () => {
    expect(consultaParaSeccao('padaria', 'hero')).toBe(consultasParaRamo('padaria').capa);
    expect(consultaParaSeccao('padaria', 'produtos')).toBe(consultasParaRamo('padaria').detalhe);
    expect(consultaParaSeccao('padaria', 'sobre')).toBe(consultasParaRamo('padaria').interior);
  });

  it('um ramo desconhecido tem pergunta na mesma', () => {
    expect(consultaParaSeccao('floricultura', 'hero').length).toBeGreaterThan(3);
  });
});
