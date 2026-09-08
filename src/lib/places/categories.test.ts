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

/**
 * Estes testes guardam a distinção entre o SLUG e o RÓTULO.
 *
 * Foram escritos depois de a coluna `business_category` ter passado meses a
 * guardar o rótulo ("Padaria") enquanto `searched_regions` e o código guardavam
 * o slug ("padaria"). O filtro por ramo no painel comparava com os slugs e
 * nunca encontrava nada: escolher um ramo não fazia absolutamente nada, sem
 * erro nenhum no ecrã.
 */
describe('slugs e rótulos não se confundem', () => {
  it('os slugs são todos minúsculos, sem espaços nem acentos', () => {
    for (const c of CATEGORIES) {
      expect(c.slug, c.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('nenhum rótulo é igual a um slug', () => {
    // Se um dia forem iguais, gravar um pelo outro deixa de dar erro visível —
    // e é exatamente assim que este bug voltaria sem ninguém dar por ele.
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    for (const c of CATEGORIES) {
      expect(slugs.has(c.label), c.label).toBe(false);
    }
  });

  it('cada slug encontra a sua categoria', () => {
    for (const c of CATEGORIES) {
      expect(findCategory(c.slug)?.label, c.slug).toBe(c.label);
    }
  });
});
