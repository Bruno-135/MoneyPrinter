import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '.';
import { briefDoModelo } from './brief';
import { PALETTES, FONTS } from '../theme';

/**
 * Os modelos desenhados à mão, como grupo.
 *
 * Não fixa quantos são: conta os que têm folha de sistema. Cada desenho novo
 * que chegue entra aqui sozinho — e se dois deles ficarem com a mesma paleta
 * ou o mesmo par de letras, é porque um copiou as cores do outro, que é
 * exactamente o erro que a pressa faz cometer.
 */
const DESENHADOS = TEMPLATES.filter((t) => t.desenho);

describe('modelos desenhados', () => {
  it('há pelo menos os seis que vieram do Claude Design', () => {
    expect(DESENHADOS.length).toBeGreaterThanOrEqual(6);
  });

  it('nenhum partilha a paleta com outro', () => {
    const paletas = DESENHADOS.map((t) => t.palette);
    expect(new Set(paletas).size).toBe(paletas.length);
  });

  it('nenhum partilha o par de letras com outro', () => {
    const letras = DESENHADOS.map((t) => t.font);
    expect(new Set(letras).size).toBe(letras.length);
  });

  it('a paleta e o par de letras de cada um existem mesmo', () => {
    for (const t of DESENHADOS) {
      expect(PALETTES[t.palette], t.id).toBeDefined();
      expect(FONTS[t.font], t.id).toBeDefined();
    }
  });

  it('o brief de cada um sai com o acento da sua paleta', () => {
    for (const t of DESENHADOS) {
      const brief = briefDoModelo(t);
      expect(brief, t.id).toContain(PALETTES[t.palette].light.accent);
      expect(brief.length, t.id).toBeGreaterThan(500);
    }
  });

  it('cada um carrega as suas letras do Google', () => {
    for (const t of DESENHADOS) {
      // Sem webfont o desenho cai na letra do sistema e desfaz-se — e foi
      // exactamente isso que aconteceu uma vez na exportação.
      expect(FONTS[t.font].webfont, t.id).toBeTruthy();
      expect(briefDoModelo(t), t.id).toContain('fonts.googleapis.com');
    }
  });
});
