import { describe, expect, it } from 'vitest';
import { cityQueryText, clampRadius, normalizeCityQuery, radiusFromViewport } from './cities';

describe('normalizeCityQuery', () => {
  it('trata o mesmo nome escrito de maneiras diferentes como uma só pergunta', () => {
    // Cada pergunta diferente é uma chamada paga. Um til não pode custar
    // dinheiro.
    const esperado = 'guimaraes';

    for (const escrito of ['Guimarães', 'guimaraes', '  GUIMARÃES  ', 'Guimarães ']) {
      expect(normalizeCityQuery(escrito), escrito).toBe(esperado);
    }
  });

  it('junta espaços a mais no meio', () => {
    expect(normalizeCityQuery('Vila  Nova   de Gaia')).toBe('vila nova de gaia');
  });

  it('aguenta os acentos do português e do Brasil', () => {
    expect(normalizeCityQuery('São Paulo')).toBe('sao paulo');
    expect(normalizeCityQuery('Belém')).toBe('belem');
    expect(normalizeCityQuery('Póvoa de Varzim')).toBe('povoa de varzim');
    expect(normalizeCityQuery('Açores')).toBe('acores');
  });
});

describe('cityQueryText', () => {
  it('pede uma cidade, e não um negócio com esse nome', () => {
    // "Braga" à seca devolve o concelho e também a mercearia chamada Braga.
    expect(cityQueryText('Braga', 'PT')).toBe('cidade de Braga, Portugal');
    expect(cityQueryText('Curitiba', 'BR')).toBe('cidade de Curitiba, Brasil');
  });
});

describe('radiusFromViewport', () => {
  it('tira o raio da área que a cidade ocupa', () => {
    // Caixa de ~0,09° de latitude (≈10 km) por ~0,12° de longitude (≈10 km) a
    // 41°N: meia diagonal ronda os 7 km.
    const raio = radiusFromViewport({
      low: { latitude: 41.5, longitude: -8.48 },
      high: { latitude: 41.59, longitude: -8.36 },
    });

    expect(raio).toBeGreaterThan(6_000);
    expect(raio).toBeLessThan(8_000);
  });

  it('uma aldeia pequena não fica com um raio ridículo', () => {
    // Sem mínimo, uma caixa minúscula dava 200 m e o varrimento falhava metade
    // do sítio.
    const raio = radiusFromViewport({
      low: { latitude: 41.5, longitude: -8.42 },
      high: { latitude: 41.503, longitude: -8.417 },
    });

    expect(raio).toBe(1_000);
  });

  it('uma cidade enorme não rebenta com o limite do Places nem com a carteira', () => {
    // São Paulo inteira. O Places recusa raios acima de 50 km, e um varrimento
    // dessa área seriam milhares de chamadas.
    const raio = radiusFromViewport({
      low: { latitude: -24.01, longitude: -46.83 },
      high: { latitude: -23.36, longitude: -46.36 },
    });

    expect(raio).toBe(25_000);
  });

  it('sem área, não inventa um raio', () => {
    expect(radiusFromViewport(null)).toBeNull();
    expect(radiusFromViewport(undefined)).toBeNull();
    expect(
      radiusFromViewport({
        low: { latitude: 41.5, longitude: -8.42 },
        high: { latitude: 41.5, longitude: -8.42 },
      }),
    ).toBeNull();
  });
});

describe('clampRadius', () => {
  it('mantém os limites em qualquer caminho, não só no da viewport', () => {
    expect(clampRadius(10)).toBe(1_000);
    expect(clampRadius(5_000)).toBe(5_000);
    expect(clampRadius(900_000)).toBe(25_000);
  });
});
