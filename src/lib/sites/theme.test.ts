import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  FONTS,
  FONT_IDS,
  PALETTES,
  PALETTE_IDS,
  parseTheme,
  suggestPalette,
  themeForBusiness,
  themeVars,
} from './theme';

describe('parseTheme', () => {
  it('devolve o tema predefinido quando não há nada guardado', () => {
    expect(parseTheme(null)).toEqual(DEFAULT_THEME);
    expect(parseTheme({})).toEqual(DEFAULT_THEME);
    expect(parseTheme('verde')).toEqual(DEFAULT_THEME);
  });

  it('lê uma paleta e um tipo de letra válidos', () => {
    expect(parseTheme({ palette: 'fresh', font: 'serif', imagem: 'padaria' })).toEqual({
      palette: 'fresh',
      font: 'serif',
      imagem: 'padaria',
    });
  });

  it('ignora valores que não existem em vez de os deixar passar', () => {
    // Um valor inventado a chegar à página produziria variáveis CSS vazias e
    // texto invisível. Cair no predefinido é sempre legível.
    expect(parseTheme({ palette: 'roxo', font: 'comic' })).toEqual(DEFAULT_THEME);
  });

  it('aceita metade do tema e completa a outra metade', () => {
    expect(parseTheme({ palette: 'ocean' })).toEqual({
      palette: 'ocean',
      font: 'sans',
      imagem: 'neutro',
    });
  });
});

describe('paletas', () => {
  it('todas definem as seis cores nos dois modos', () => {
    const required = ['bg', 'fg', 'surface', 'accent', 'onAccent', 'line'] as const;

    for (const id of PALETTE_IDS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const token of required) {
          expect(PALETTES[id][mode][token], `${id}.${mode}.${token}`).toMatch(
            /^#[0-9A-Fa-f]{6}$/,
          );
        }
      }
    }
  });

  it('o identificador de cada paleta bate certo com a chave do mapa', () => {
    for (const id of PALETTE_IDS) {
      expect(PALETTES[id].id).toBe(id);
    }
  });

  it('o acento nunca é igual ao fundo', () => {
    // Se coincidissem, o botão desaparecia na página. É o tipo de engano que
    // só se vê depois de o comerciante abrir o link.
    for (const id of PALETTE_IDS) {
      for (const mode of ['light', 'dark'] as const) {
        const { accent, bg, onAccent } = PALETTES[id][mode];
        expect(accent.toLowerCase(), `${id}.${mode}`).not.toBe(bg.toLowerCase());
        expect(onAccent.toLowerCase(), `${id}.${mode}`).not.toBe(accent.toLowerCase());
      }
    }
  });
});

describe('suggestPalette', () => {
  it('dá verde a uma floricultura', () => {
    expect(suggestPalette(['florist', 'store'])).toBe('fresh');
  });

  it('dá noite a um bar', () => {
    expect(suggestPalette(['bar', 'point_of_interest'])).toBe('night');
  });

  it('dá azul a um consultório', () => {
    expect(suggestPalette(['dentist', 'health'])).toBe('ocean');
  });

  it('cai no quente para uma padaria e para o que não conhece', () => {
    expect(suggestPalette(['bakery'])).toBe('warm');
    expect(suggestPalette([])).toBe('warm');
    expect(suggestPalette(['loja_de_coisas_estranhas'])).toBe('warm');
  });
});

describe('themeVars', () => {
  it('devolve as sete variáveis que a página usa', () => {
    const vars = themeVars({ palette: 'fresh', font: 'serif', imagem: 'neutro' }, 'light');

    expect(Object.keys(vars).sort()).toEqual([
      '--site-accent',
      '--site-bg',
      '--site-fg',
      '--site-font',
      '--site-line',
      '--site-on-accent',
      '--site-surface',
    ]);
    expect(vars['--site-accent']).toBe(PALETTES.fresh.light.accent);
    expect(vars['--site-font']).toBe(FONTS.serif.stack);
  });

  it('cada tipo de letra tem alternativas, não uma família só', () => {
    // Uma família sozinha que o dispositivo não tenha cai numa letra qualquer
    // decidida pelo browser, e a página deixa de ser a que se aprovou.
    for (const id of FONT_IDS) {
      expect(FONTS[id].stack.split(',').length).toBeGreaterThan(1);
    }
  });
});

describe('parseTheme e a família das imagens', () => {
  it('recusa uma família que não existe em vez de a deixar chegar ao endereço', () => {
    expect(parseTheme({ palette: 'ocean', imagem: '../../etc/passwd' }).imagem).toBe('neutro');
  });

  it('os sites antigos, sem o campo, ficam no neutro', () => {
    expect(parseTheme({ palette: 'warm', font: 'sans' }).imagem).toBe('neutro');
  });
});

describe('themeForBusiness', () => {
  it('tira a família do ramo e não dos tipos da Google', () => {
    expect(themeForBusiness([], 'padaria').imagem).toBe('padaria');
    expect(themeForBusiness([], 'advogados').imagem).toBe('escritorio');
  });

  it('um comércio sem ramo conhecido continua a ter tema', () => {
    const tema = themeForBusiness(['florist'], 'floricultura');
    expect(tema.imagem).toBe('neutro');
    expect(tema.palette).toBeDefined();
  });
});
