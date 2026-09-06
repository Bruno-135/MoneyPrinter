import { describe, expect, it } from 'vitest';
import { CATEGORIES, categorySlugs, findCategory } from './categories';

describe('CATEGORIES', () => {
  it('cobre os 14 ramos pedidos', () => {
    expect(CATEGORIES).toHaveLength(14);
  });

  it('não tem slugs repetidos', () => {
    expect(new Set(categorySlugs()).size).toBe(CATEGORIES.length);
  });

  it('todos têm pelo menos um tipo e uma consulta de recurso', () => {
    for (const c of CATEGORIES) {
      expect(c.includedTypes.length).toBeGreaterThan(0);
      expect(c.textQuery).toContain('{zona}');
    }
  });

  it('marca restaurantes e padarias como food_service, e mais nenhum', () => {
    const food = CATEGORIES.filter((c) => c.foodService).map((c) => c.slug);
    expect(food.sort()).toEqual(['padaria', 'restaurante']);
  });
});

describe('findCategory', () => {
  it('encontra pelo slug', () => {
    expect(findCategory('padaria')?.label).toBe('Padaria');
  });

  it('encontra pelo rótulo, ignorando acentos e maiúsculas', () => {
    expect(findCategory('Salão de beleza')?.slug).toBe('salao-beleza');
    expect(findCategory('SALAO DE BELEZA')?.slug).toBe('salao-beleza');
    expect(findCategory('ginásio')?.slug).toBe('ginasio');
    expect(findCategory('GINASIO')?.slug).toBe('ginasio');
  });

  it('devolve null para um ramo desconhecido', () => {
    expect(findCategory('floricultura')).toBeNull();
  });
});
