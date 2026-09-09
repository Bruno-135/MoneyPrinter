import { describe, expect, it } from 'vitest';
import { arteSvg, arteUrl, ehFamilia, familiaParaRamo, limparSemente, PALETAS } from './arte';

describe('familiaParaRamo', () => {
  it('dá a cada ramo conhecido a sua família', () => {
    expect(familiaParaRamo('padaria')).toBe('padaria');
    expect(familiaParaRamo('pet-shop')).toBe('animais');
    expect(familiaParaRamo('clinica-dentaria')).toBe('clinica');
  });

  it('não se importa com maiúsculas nem espaços', () => {
    expect(familiaParaRamo('  Padaria ')).toBe('padaria');
  });

  it('cai no neutro em vez de rebentar', () => {
    expect(familiaParaRamo('floricultura')).toBe('neutro');
    expect(familiaParaRamo(null)).toBe('neutro');
    expect(familiaParaRamo('')).toBe('neutro');
  });

  it('nunca aponta para uma família que não existe', () => {
    for (const slug of ['padaria', 'restaurante', 'advogados', 'inventado']) {
      expect(PALETAS[familiaParaRamo(slug)]).toBeDefined();
    }
  });
});

describe('arteSvg', () => {
  it('é sempre igual para a mesma semente', () => {
    expect(arteSvg('padaria', 'casa-do-forno-hero')).toBe(arteSvg('padaria', 'casa-do-forno-hero'));
  });

  it('muda quando muda a semente ou a família', () => {
    const a = arteSvg('padaria', 'casa-do-forno-hero');
    expect(a).not.toBe(arteSvg('padaria', 'casa-do-forno-sobre'));
    expect(a).not.toBe(arteSvg('clinica', 'casa-do-forno-hero'));
  });

  it('sai um SVG fechado, com o fundo da paleta', () => {
    const svg = arteSvg('cafe', 'torrada');
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain(PALETAS.cafe.base);
  });

  it('não deixa entrar nada executável vindo da semente', () => {
    const svg = arteSvg('padaria', '"><script>alert(1)</script>');
    expect(svg).not.toContain('<script');
  });

  it('gera todas as famílias sem falhar', () => {
    for (const familia of Object.keys(PALETAS)) {
      expect(ehFamilia(familia)).toBe(true);
      expect(arteSvg(familia as keyof typeof PALETAS, 'x').length).toBeGreaterThan(200);
    }
  });
});

describe('limparSemente e arteUrl', () => {
  it('tira acentos, maiúsculas e pontuação', () => {
    expect(limparSemente('Padaria São João — Hero')).toBe('padaria-sao-joao-hero');
  });

  it('nunca devolve vazio', () => {
    expect(limparSemente('!!!')).toBe('sem-nome');
  });

  it('trava o tamanho para o endereço não crescer sem fim', () => {
    expect(limparSemente('a'.repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it('monta um caminho que a rota reconhece', () => {
    expect(arteUrl('padaria', 'Casa do Forno · hero')).toBe('/arte/padaria/casa-do-forno-hero.svg');
  });
});
