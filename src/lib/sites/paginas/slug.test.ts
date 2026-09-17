import { describe, expect, it } from 'vitest';
import { enderecoDaPagina, sugerirSlug, menuDoSite } from './repository';

describe('sugerirSlug', () => {
  it('tira acentos, espaços e maiúsculas', () => {
    expect(sugerirSlug('Moda Mulher')).toBe('moda-mulher');
    expect(sugerirSlug('Contacto e Loja')).toBe('contacto-e-loja');
    expect(sugerirSlug('Ementa à Lista')).toBe('ementa-a-lista');
  });

  it('não deixa traços nas pontas nem repetidos', () => {
    expect(sugerirSlug('  — Peças —  ')).toBe('pecas');
    expect(sugerirSlug('A // B')).toBe('a-b');
  });

  it('corta nos 40 e não acaba em traço', () => {
    const s = sugerirSlug('a'.repeat(38) + ' palavra comprida');
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith('-')).toBe(false);
  });

  it('o que sai passa na validação da base de dados', () => {
    // O mesmo padrão do CHECK da migração 0031.
    const padrao = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const t of ['Moda Mulher', 'Ficha da Peça', 'Como comprar e pagar', 'Contacto']) {
      expect(padrao.test(sugerirSlug(t)), t).toBe(true);
    }
  });
});

describe('enderecoDaPagina', () => {
  it('a inicial não leva barra a mais', () => {
    expect(enderecoDaPagina('abc123', '')).toBe('/s/abc123');
  });

  it('as outras penduram-se na inicial', () => {
    expect(enderecoDaPagina('abc123', 'mulher')).toBe('/s/abc123/mulher');
  });
});

describe('menuDoSite', () => {
  const paginas = [
    { id: '1', slug: 'mulher', titulo: 'Mulher', html: null, ordem: 0, geradaEm: null },
    { id: '2', slug: 'contacto', titulo: 'Contacto', html: null, ordem: 1, geradaEm: null },
  ];

  it('põe a inicial à frente, sempre', () => {
    const menu = menuDoSite('abc123', paginas, 'mulher');
    expect(menu.map((m) => m.titulo)).toEqual(['Início', 'Mulher', 'Contacto']);
    expect(menu[0]?.endereco).toBe('/s/abc123');
  });

  it('marca a página actual, e só essa', () => {
    const menu = menuDoSite('abc123', paginas, 'mulher');
    expect(menu.filter((m) => m.atual).map((m) => m.titulo)).toEqual(['Mulher']);
  });

  it('a inicial é a actual quando o slug é vazio', () => {
    const menu = menuDoSite('abc123', paginas, '');
    expect(menu[0]?.atual).toBe(true);
  });
});
