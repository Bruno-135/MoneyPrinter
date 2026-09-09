import { FONTS, PALETTES, type FontId, type PaletteId, type SiteTheme } from './theme';

/**
 * O sistema visual dos sites gerados: o que separa um site que parece HTML de
 * um site que parece feito por uma agência.
 *
 * A cor e o tipo de letra já viviam em `theme.ts` e continuam lá. O que faltava
 * era tudo o resto — e é aí que está a diferença. Um site amador e um site
 * profissional podem ter exatamente as mesmas cores: o que os distingue é o
 * espaço à volta das coisas, o tamanho relativo dos títulos, o peso das
 * sombras, e o facto de haver um ritmo em vez de valores escolhidos um a um.
 *
 * Por isso isto não é uma lista de opções soltas. São CONJUNTOS: cada família
 * de estilo traz a sua escala inteira, pensada junta. Trocar de família troca
 * o site todo de carácter, e nunca dá uma combinação que ninguém aprovou.
 */

/** As quatro famílias. É por aqui que se escolhe o carácter do site. */
export const STYLE_IDS = ['premium', 'minimal', 'interativo', 'simples'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export interface StyleTokens {
  /**
   * Ritmo vertical entre secções.
   *
   * É a variável que mais separa amador de profissional. Um site amador tem
   * 24px entre tudo; um site profissional respira, e respira mais no desktop
   * do que no telemóvel.
   */
  sectionY: string;
  /** Largura máxima do conteúdo. Texto largo de mais não se lê. */
  container: string;
  /** Espaço entre elementos dentro de uma secção. */
  gap: string;

  /** Raio dos cantos. Zero é sério, muito é simpático. */
  radius: string;
  /** Raio dos elementos pequenos: botões, selos. */
  radiusSm: string;

  /** Sombra dos cartões em repouso. */
  shadow: string;
  /** Sombra ao passar o rato. Faz o cartão levantar. */
  shadowHover: string;
  /** Espessura das linhas. */
  border: string;

  /** Tamanho do título principal. `clamp` para escalar sem saltos. */
  h1: string;
  /** Títulos de secção. */
  h2: string;
  /** Corpo de texto. */
  body: string;
  /** Entrelinha do corpo. Apertada demais cansa; larga demais desfaz. */
  leading: string;
  /** Espaçamento entre letras dos títulos grandes. Títulos grandes pedem menos. */
  tracking: string;
  /** Peso dos títulos. */
  weight: string;

  /** Se as secções aparecem ao rolar, e quão depressa. `none` desliga tudo. */
  motion: 'none' | 'subtle' | 'lively';
}

export interface StyleDefinition {
  id: StyleId;
  label: string;
  /** Uma frase, para quem escolhe no ecrã. */
  tagline: string;
  /** Para que negócios foi pensado. Também vai no prompt da IA. */
  suits: string;
  tokens: StyleTokens;
}

/**
 * As quatro famílias, com as escalas escolhidas em conjunto.
 *
 * Os números não são redondos por acaso: `clamp(min, preferido, max)` deixa o
 * título crescer com o ecrã sem precisar de pontos de quebra, e sem ficar
 * gigante num monitor grande nem ilegível num telemóvel.
 */
export const STYLES: Record<StyleId, StyleDefinition> = {
  premium: {
    id: 'premium',
    label: 'Premium',
    tagline: 'Espaçoso, tipografia grande, ar de marca estabelecida.',
    suits:
      'restaurantes com sala, clínicas, hotéis, imobiliárias, advogados — negócios onde a ' +
      'primeira impressão tem de dizer "isto é sério e é caro".',
    tokens: {
      sectionY: 'clamp(4.5rem, 9vw, 8rem)',
      container: '72rem',
      gap: 'clamp(1.75rem, 3vw, 3rem)',
      radius: '1.25rem',
      radiusSm: '0.625rem',
      shadow: '0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -12px rgb(0 0 0 / 0.14)',
      shadowHover: '0 2px 4px rgb(0 0 0 / 0.05), 0 24px 48px -16px rgb(0 0 0 / 0.22)',
      border: '1px',
      h1: 'clamp(2.75rem, 6.5vw, 5rem)',
      h2: 'clamp(1.875rem, 3.5vw, 2.75rem)',
      body: 'clamp(1.0625rem, 1.15vw, 1.1875rem)',
      leading: '1.65',
      // Títulos muito grandes com espaçamento normal parecem soltos. Apertar
      // um bocadinho é o que faz uma manchete parecer desenhada.
      tracking: '-0.025em',
      weight: '600',
      motion: 'subtle',
    },
  },

  minimal: {
    id: 'minimal',
    label: 'Minimalista',
    tagline: 'Muito branco, pouca cor, o conteúdo a falar sozinho.',
    suits:
      'estúdios, fotógrafos, arquitetos, consultores, profissionais liberais — quem vende ' +
      'critério e não quer que o site grite.',
    tokens: {
      sectionY: 'clamp(4rem, 8vw, 7rem)',
      container: '64rem',
      gap: 'clamp(1.5rem, 2.5vw, 2.5rem)',
      // Cantos vivos: no minimalismo o canto redondo é ruído.
      radius: '0.25rem',
      radiusSm: '0.25rem',
      // Sem sombra nenhuma. A separação faz-se com linha e com espaço.
      shadow: 'none',
      shadowHover: 'none',
      border: '1px',
      h1: 'clamp(2.25rem, 5vw, 3.75rem)',
      h2: 'clamp(1.5rem, 2.75vw, 2.125rem)',
      body: 'clamp(1rem, 1.1vw, 1.125rem)',
      leading: '1.75',
      tracking: '-0.015em',
      weight: '500',
      motion: 'subtle',
    },
  },

  interativo: {
    id: 'interativo',
    label: 'Interativo',
    tagline: 'Cor cheia, cartões que reagem, movimento ao rolar.',
    suits:
      'ginásios, barbearias, pet shops, floriculturas, lojas — negócios de rua que vivem de ' +
      'energia e de mostrar produto.',
    tokens: {
      sectionY: 'clamp(3.5rem, 7vw, 6rem)',
      container: '76rem',
      gap: 'clamp(1.25rem, 2.5vw, 2rem)',
      radius: '1.5rem',
      radiusSm: '9999px',
      shadow: '0 2px 6px rgb(0 0 0 / 0.06), 0 16px 32px -12px rgb(0 0 0 / 0.18)',
      shadowHover: '0 4px 10px rgb(0 0 0 / 0.08), 0 28px 56px -16px rgb(0 0 0 / 0.28)',
      border: '2px',
      h1: 'clamp(2.5rem, 7vw, 4.5rem)',
      h2: 'clamp(1.75rem, 3.5vw, 2.5rem)',
      body: 'clamp(1.0625rem, 1.15vw, 1.125rem)',
      leading: '1.6',
      tracking: '-0.03em',
      weight: '700',
      motion: 'lively',
    },
  },

  simples: {
    id: 'simples',
    label: 'HTML Simples',
    tagline: 'Direto, leve, sem efeitos. Simples por escolha, não por falta.',
    suits:
      'oficinas, contabilistas, canalizadores, negócios de bairro — quem quer o telefone e a ' +
      'morada à vista e não quer nada a mexer.',
    tokens: {
      // Compacto de propósito: aqui a virtude é caber tudo num ecrã ou dois.
      sectionY: 'clamp(2.5rem, 5vw, 3.5rem)',
      container: '56rem',
      gap: '1.25rem',
      radius: '0.5rem',
      radiusSm: '0.375rem',
      // Uma sombra mínima, só para os cartões não colarem ao fundo.
      shadow: '0 1px 2px rgb(0 0 0 / 0.06)',
      shadowHover: '0 1px 2px rgb(0 0 0 / 0.06)',
      border: '1px',
      h1: 'clamp(1.875rem, 4vw, 2.75rem)',
      h2: 'clamp(1.375rem, 2.25vw, 1.75rem)',
      body: '1.0625rem',
      leading: '1.7',
      tracking: '-0.01em',
      weight: '600',
      // Nenhum movimento. É metade da promessa deste estilo.
      motion: 'none',
    },
  },
};

export const DEFAULT_STYLE: StyleId = 'premium';

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && (STYLE_IDS as readonly string[]).includes(value);
}

/**
 * O visual completo de um site: cor, letra e família de estilo.
 *
 * Guarda-se na coluna `theme` do site, junto com o que já lá estava. Um site
 * antigo, sem `style`, lê-se como 'simples' — que é honestamente o que ele é.
 */
export interface SiteStyle extends SiteTheme {
  style: StyleId;
}

export function parseStyle(raw: unknown, theme: SiteTheme): SiteStyle {
  const style =
    raw !== null && typeof raw === 'object' && isStyleId((raw as { style?: unknown }).style)
      ? (raw as { style: StyleId }).style
      : // Sem família gravada, o site é anterior a isto tudo: era uma página
        // simples e continua a ser lida como tal. Prometer-lhe "Premium" seria
        // mostrá-la com espaçamentos que ela nunca teve em mente.
        'simples';

  return { ...theme, style };
}

/**
 * Todas as variáveis CSS de um site, num objeto para o `style` da raiz.
 *
 * Uma só passagem: cor, letra e estilo saem daqui juntos. As secções leem
 * `var(--site-*)` e não sabem nada sobre paletas nem famílias — é isso que
 * permite acrescentar uma família nova sem tocar em nenhuma secção.
 */
export function styleVars(site: SiteStyle, mode: 'light' | 'dark'): Record<string, string> {
  const palette = PALETTES[site.palette][mode];
  const t = STYLES[site.style].tokens;

  return {
    '--site-bg': palette.bg,
    '--site-fg': palette.fg,
    '--site-surface': palette.surface,
    '--site-accent': palette.accent,
    '--site-on-accent': palette.onAccent,
    '--site-line': palette.line,
    '--site-font': FONTS[site.font].stack,

    '--site-section-y': t.sectionY,
    '--site-container': t.container,
    '--site-gap': t.gap,
    '--site-radius': t.radius,
    '--site-radius-sm': t.radiusSm,
    '--site-shadow': t.shadow,
    '--site-shadow-hover': t.shadowHover,
    '--site-border': t.border,
    '--site-h1': t.h1,
    '--site-h2': t.h2,
    '--site-body': t.body,
    '--site-leading': t.leading,
    '--site-tracking': t.tracking,
    '--site-weight': t.weight,
  };
}

/** Só para quem precisa de saber se anima — o resto lê as variáveis. */
export function motionOf(style: StyleId): StyleTokens['motion'] {
  return STYLES[style].tokens.motion;
}

export type { FontId, PaletteId, SiteTheme };
