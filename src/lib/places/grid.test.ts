import { describe, expect, it } from 'vitest';
import { buildGrid, cellKey, distanceMeters } from './grid';

const BRAGA = { lat: 41.5454, lng: -8.4265 };

describe('distanceMeters', () => {
  it('dá zero para o mesmo ponto', () => {
    expect(distanceMeters(BRAGA, BRAGA)).toBe(0);
  });

  it('bate com uma distância conhecida (Braga - Porto, ~48 km)', () => {
    const porto = { lat: 41.1579, lng: -8.6291 };
    const km = distanceMeters(BRAGA, porto) / 1000;
    expect(km).toBeGreaterThan(45);
    expect(km).toBeLessThan(52);
  });
});

describe('cellKey', () => {
  it('é estável entre execuções com os mesmos valores', () => {
    expect(cellKey(41.54548, -8.42651, 1500)).toBe(cellKey(41.54548, -8.42651, 1500));
  });

  it('arredonda a 4 casas, para ~11 m não gerarem chaves diferentes', () => {
    expect(cellKey(41.545481, -8.426511, 1500)).toBe(cellKey(41.545484, -8.426514, 1500));
  });

  it('distingue raios diferentes no mesmo ponto', () => {
    expect(cellKey(41.5454, -8.4265, 1000)).not.toBe(cellKey(41.5454, -8.4265, 1500));
  });
});

describe('buildGrid', () => {
  it('devolve uma única célula quando a região cabe nela', () => {
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: 800, cellRadiusMeters: 1500 });
    expect(grid).toHaveLength(1);
    expect(grid[0]?.lat).toBe(BRAGA.lat);
  });

  it('cobre a região inteira: nenhum ponto fica a mais de um raio de uma célula', () => {
    const regionRadius = 4_000;
    const cellRadius = 1_500;
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: regionRadius, cellRadiusMeters: cellRadius });

    // Amostragem de pontos dentro da região, incluindo a orla.
    for (let bearing = 0; bearing < 360; bearing += 15) {
      for (const fraction of [0.1, 0.35, 0.6, 0.85, 1]) {
        const d = regionRadius * fraction;
        const rad = (bearing * Math.PI) / 180;
        const lat = BRAGA.lat + (d * Math.cos(rad)) / 111_320;
        const lng =
          BRAGA.lng + (d * Math.sin(rad)) / (111_320 * Math.cos((BRAGA.lat * Math.PI) / 180));

        const nearest = Math.min(...grid.map((c) => distanceMeters({ lat, lng }, c)));
        expect(nearest).toBeLessThanOrEqual(cellRadius);
      }
    }
  });

  it('espaça os centros a r·√3, que é o que a torna hexagonal', () => {
    // É este espaçamento que faz a diferença de custo: uma grelha quadrada
    // precisaria de centros a r·√2, ou seja, mais pontos e mais chamadas pagas.
    // Comparar contagens contra uma estimativa por área seria enganador numa
    // região pequena, onde a orla de folga domina; a propriedade geométrica é
    // o que se pode afirmar sem ressalvas.
    const cellRadius = 1_500;
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: 8_000, cellRadiusMeters: cellRadius });

    let closest = Infinity;
    for (let i = 0; i < grid.length; i++) {
      for (let j = i + 1; j < grid.length; j++) {
        closest = Math.min(closest, distanceMeters(grid[i]!, grid[j]!));
      }
    }

    const expected = cellRadius * Math.sqrt(3);
    expect(closest).toBeGreaterThan(expected * 0.97);
    expect(closest).toBeLessThan(expected * 1.03);
  });

  it('numa região grande, aproxima-se da densidade teórica do arranjo hexagonal', () => {
    // Longe da fronteira, a orla deixa de dominar e a contagem tem de bater
    // com area / (2,598 · r²), que é a densidade de um arranjo hexagonal.
    const regionRadius = 40_000;
    const cellRadius = 1_500;
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: regionRadius, cellRadiusMeters: cellRadius });

    const theoretical = (Math.PI * regionRadius ** 2) / (2.598 * cellRadius ** 2);
    expect(grid.length).toBeGreaterThan(theoretical * 0.85);
    expect(grid.length).toBeLessThan(theoretical * 1.25);

    // E continua a ser menos do que uma grelha quadrada precisaria.
    const squareCount = (Math.PI * regionRadius ** 2) / (2 * cellRadius ** 2);
    expect(grid.length).toBeLessThan(squareCount);
  });

  it('não repete chaves', () => {
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: 6_000, cellRadiusMeters: 1_000 });
    expect(new Set(grid.map((c) => c.key)).size).toBe(grid.length);
  });

  it('ordena do centro para fora, para um varrimento truncado cobrir o núcleo', () => {
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: 6_000, cellRadiusMeters: 1_500 });
    const distances = grid.map((c) => distanceMeters(BRAGA, c));
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]!).toBeGreaterThanOrEqual(distances[i - 1]! - 1e-6);
    }
  });

  it('produz um número de pontos plausível para o concelho de Braga', () => {
    // ~183 km² -> raio equivalente ~7,6 km. Com células de 1,5 km espera-se
    // algo na casa das dezenas, não centenas nem meia dúzia.
    const grid = buildGrid({ center: BRAGA, regionRadiusMeters: 7_600, cellRadiusMeters: 1_500 });
    expect(grid.length).toBeGreaterThan(20);
    expect(grid.length).toBeLessThan(90);
  });

  it('recusa coordenadas e raios inválidos', () => {
    expect(() => buildGrid({ center: { lat: 95, lng: 0 }, regionRadiusMeters: 1000, cellRadiusMeters: 500 })).toThrow(/Latitude/);
    expect(() => buildGrid({ center: BRAGA, regionRadiusMeters: 1000, cellRadiusMeters: 0 })).toThrow(/célula/);
    expect(() => buildGrid({ center: BRAGA, regionRadiusMeters: -1, cellRadiusMeters: 500 })).toThrow(/região/);
  });

  it('funciona no Brasil, onde a longitude tem outra escala', () => {
    const saoPaulo = { lat: -23.5505, lng: -46.6333 };
    const grid = buildGrid({ center: saoPaulo, regionRadiusMeters: 4_000, cellRadiusMeters: 1_500 });
    for (const cell of grid) {
      expect(distanceMeters(saoPaulo, cell)).toBeLessThanOrEqual(4_000 + 1_500);
    }
  });
});
