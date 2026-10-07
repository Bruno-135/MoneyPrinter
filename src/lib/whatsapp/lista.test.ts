import { describe, expect, it } from 'vitest';
import {
  SEM_FILTROS,
  contar,
  contarNumeros,
  ehMovel,
  faixaDoScore,
  filtrar,
  ordenar,
  type LinhaWhatsapp,
} from './lista';

function lead(p: Partial<LinhaWhatsapp>): LinhaWhatsapp {
  return {
    id: p.id ?? Math.random().toString(36),
    nome: 'Lead',
    ramo: 'padaria',
    pais: 'PT',
    cidade: null,
    score: 80,
    telefone: '+351912345678',
    contacto: 'por_contactar',
    contactadoEm: null,
    adicionadoEm: null,
    ...p,
  };
}

describe('ehMovel', () => {
  it('telemóveis portugueses', () => {
    for (const n of ['+351912345678', '+351922345678', '+351932345678', '+351962345678'])
      expect(ehMovel(n), n).toBe(true);
  });
  it('fixos portugueses e prefixos que não são móveis', () => {
    for (const n of ['+351253123456', '+351212345678', '+351902345678', '+351942345678'])
      expect(ehMovel(n), n).toBe(false);
  });
  it('telemóveis brasileiros: código de área e nono dígito', () => {
    expect(ehMovel('+5511912345678')).toBe(true);
    expect(ehMovel('+5521998765432')).toBe(true);
  });
  it('fixos brasileiros', () => {
    expect(ehMovel('+551132345678')).toBe(false);
    expect(ehMovel('+552122345678')).toBe(false);
  });
  it('sem número', () => {
    expect(ehMovel(null)).toBe(false);
    expect(ehMovel('')).toBe(false);
  });
});

describe('faixaDoScore — mesmos limiares que scoreLabel', () => {
  it('cada fronteira', () => {
    expect(faixaDoScore(90)).toBe('muito_quente');
    expect(faixaDoScore(89)).toBe('quente');
    expect(faixaDoScore(75)).toBe('quente');
    expect(faixaDoScore(74)).toBe('morno');
    expect(faixaDoScore(60)).toBe('morno');
    expect(faixaDoScore(59)).toBe('frio');
    expect(faixaDoScore(0)).toBe('frio');
  });
});

describe('filtrar', () => {
  const linhas = [
    lead({ id: '1', pais: 'PT', ramo: 'padaria', score: 95 }),
    lead({ id: '2', pais: 'BR', ramo: 'padaria', score: 70, telefone: '+5511912345678' }),
    lead({ id: '3', pais: 'PT', ramo: 'restaurante', score: 50, telefone: '+351253123456' }),
    lead({ id: '4', pais: 'PT', ramo: 'padaria', score: 80, contacto: 'whatsapp_enviado' }),
  ];
  const ids = (l: LinhaWhatsapp[]) => l.map((x) => x.id).sort();

  it('por omissão só mostra móveis', () => {
    expect(ids(filtrar(linhas, SEM_FILTROS))).toEqual(['1', '2', '4']);
  });
  it('«todos com telefone» inclui os fixos', () => {
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, numero: 'todos' }))).toEqual(['1', '2', '3', '4']);
  });
  it('país, ramo e score combinam-se', () => {
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, pais: 'PT', ramo: 'padaria' }))).toEqual([
      '1',
      '4',
    ]);
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, faixa: 'muito_quente' }))).toEqual(['1']);
  });
  it('contacto usa as escolhas do painel', () => {
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, contacto: 'whatsapp' }))).toEqual(['4']);
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, contacto: 'por' }))).toEqual(['1', '2']);
  });
  it('um filtro desconhecido não esconde nada', () => {
    expect(ids(filtrar(linhas, { ...SEM_FILTROS, contacto: 'lixo' }))).toEqual(['1', '2', '4']);
  });
});

describe('contar — com o filtro da própria caixa de fora', () => {
  const linhas = [
    lead({ pais: 'PT', ramo: 'padaria' }),
    lead({ pais: 'PT', ramo: 'restaurante' }),
    lead({ pais: 'BR', ramo: 'padaria', telefone: '+5511912345678' }),
  ];

  it('escolher um país não esvazia a caixa dos países', () => {
    const c = contar(linhas, { ...SEM_FILTROS, pais: 'PT' }, 'pais');
    expect(c.get('PT')).toBe(2);
    expect(c.get('BR')).toBe(1);
  });
  it('as outras caixas respeitam o país escolhido', () => {
    const c = contar(linhas, { ...SEM_FILTROS, pais: 'PT' }, 'ramo');
    expect(c.get('padaria')).toBe(1);
    expect(c.get('restaurante')).toBe(1);
  });
  it('números: móveis e total', () => {
    const l = [...linhas, lead({ telefone: '+351253123456' })];
    expect(contarNumeros(l, SEM_FILTROS)).toEqual({ movel: 3, todos: 4 });
  });
});

describe('ordenar', () => {
  const l = [
    lead({ id: 'a', nome: 'Zeca', score: 70, adicionadoEm: '2026-01-01' }),
    lead({ id: 'b', nome: 'Ana', score: 90, adicionadoEm: '2026-03-01' }),
    lead({ id: 'c', nome: 'Bia', score: 90, adicionadoEm: '2026-02-01' }),
  ];
  it('score, desempata por nome', () => {
    expect(ordenar(l, 'score').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('nome', () => {
    expect(ordenar(l, 'nome').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('mais novos primeiro', () => {
    expect(ordenar(l, 'novos').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});
