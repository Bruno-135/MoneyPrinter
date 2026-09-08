import { describe, expect, it } from 'vitest';
import { COUNTRY_BOUNDS, CUSTOM_ZONE, DEFAULT_ZONE, ZONES, findZone } from './zones';

/**
 * Uma coordenada errada aqui não parte nada — faz um varrimento pago no meio do
 * mar e devolve zero comércios, com o nome da cidade certa em cima. É um erro
 * caro e silencioso, e é exatamente o tipo de coisa que um teste apanha e uma
 * revisão à vista não.
 */

describe('ZONES', () => {
  it('cada zona cai dentro do país que diz ser', () => {
    for (const zone of ZONES) {
      const bounds = COUNTRY_BOUNDS[zone.pais];

      expect(zone.lat, `${zone.nome}: latitude`).toBeGreaterThanOrEqual(bounds.lat[0]);
      expect(zone.lat, `${zone.nome}: latitude`).toBeLessThanOrEqual(bounds.lat[1]);
      expect(zone.lng, `${zone.nome}: longitude`).toBeGreaterThanOrEqual(bounds.lng[0]);
      expect(zone.lng, `${zone.nome}: longitude`).toBeLessThanOrEqual(bounds.lng[1]);
    }
  });

  it('não há identificadores repetidos', () => {
    // Dois iguais fazem o `<select>` escolher sempre o primeiro, e a segunda
    // cidade deixa de se conseguir escolher.
    const ids = ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nenhuma zona usa o identificador reservado das coordenadas à mão', () => {
    expect(ZONES.some((z) => z.id === CUSTOM_ZONE)).toBe(false);
  });

  it('a zona por omissão existe', () => {
    expect(findZone(DEFAULT_ZONE)?.nome).toBe('Braga');
  });

  it('cidades diferentes têm coordenadas diferentes', () => {
    // Copiar uma linha e trocar só o nome é o erro mais fácil de cometer nesta
    // lista, e o resultado seria procurar em Braga a dizer "Porto".
    const pontos = ZONES.map((z) => `${z.lat},${z.lng}`);
    expect(new Set(pontos).size).toBe(pontos.length);
  });
});

describe('findZone', () => {
  it('devolve a zona pedida', () => {
    expect(findZone('porto')).toMatchObject({ nome: 'Porto', pais: 'PT' });
  });

  it('devolve indefinido para o que não conhece', () => {
    expect(findZone(CUSTOM_ZONE)).toBeUndefined();
    expect(findZone('atlantida')).toBeUndefined();
  });
});
