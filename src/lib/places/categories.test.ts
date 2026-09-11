import { describe, expect, it } from 'vitest';
import { CATEGORIES, categorySlugs, categoryTextQuery, findCategory, isTextOnly } from './categories';

describe('CATEGORIES', () => {
  it('tem ramos que cheguem para haver por onde escolher', () => {
    // Sem número fixo: a lista cresce à medida que se descobrem mercados, e um
    // teste que conte os ramos só serve para ter de ser mudado a cada um.
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(30);
  });

  it('não tem slugs repetidos', () => {
    expect(new Set(categorySlugs()).size).toBe(CATEGORIES.length);
  });

  it('todos sabem dizer onde procurar', () => {
    // A consulta de texto é obrigatória em TODOS. Nos que não têm tipo é o
    // único caminho, e nos outros é o que salva o varrimento quando a Google
    // rejeita o tipo.
    for (const c of CATEGORIES) {
      expect(c.textQuery, c.slug).toContain('{zona}');
      if (c.textQueryBR !== undefined) expect(c.textQueryBR, c.slug).toContain('{zona}');
    }
  });

  it('os ramos sem tipo no Google são poucos e deliberados', () => {
    // Uma lista de tipos vazia é uma decisão, não um esquecimento. Se um dia
    // passar de metade da lista, é sinal de que se deixou de a preencher.
    const semTipo = CATEGORIES.filter(isTextOnly);
    expect(semTipo.length).toBeGreaterThan(0);
    expect(semTipo.length).toBeLessThan(CATEGORIES.length / 2);
  });

  it('marca restaurantes e padarias como food_service, e mais nenhum', () => {
    const food = CATEGORIES.filter((c) => c.foodService).map((c) => c.slug);
    expect(food.sort()).toEqual(['padaria', 'restaurante']);
  });
});

describe('categoryTextQuery', () => {
  const ginasio = findCategory('ginasio')!;
  const padaria = findCategory('padaria')!;

  it('usa a palavra do Brasil quando o ramo tem uma', () => {
    // "Ginásio" em Braga é "academia" em Curitiba. A pesquisa por texto é
    // literal: a palavra errada devolve meia dúzia de resultados e faz parecer
    // que não há mercado.
    expect(categoryTextQuery(ginasio, 'PT', 'Braga')).toBe('ginásios em Braga');
    expect(categoryTextQuery(ginasio, 'BR', 'Curitiba')).toBe('academias em Curitiba');
  });

  it('cai na de Portugal quando não há variante', () => {
    expect(categoryTextQuery(padaria, 'BR', 'Curitiba')).toBe('padarias em Curitiba');
  });

  it('aceita o código em minúsculas', () => {
    expect(categoryTextQuery(ginasio, 'br', 'Curitiba')).toBe('academias em Curitiba');
  });

  it('substitui a zona e não deixa a marca para trás', () => {
    for (const c of CATEGORIES) {
      for (const pais of ['PT', 'BR']) {
        expect(categoryTextQuery(c, pais, 'Braga'), `${c.slug}/${pais}`).not.toContain('{zona}');
      }
    }
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
