import { ehFamilia, familiaParaRamo, type Familia } from './imagens/arte';

/**
 * Aparência da landing page: paleta e tipo de letra.
 *
 * As paletas são NOMEADAS de propósito, em vez de guardarmos cores soltas.
 * Três razões:
 *
 * 1. O comerciante escolhe "Verde, ar de bem-estar", não `#2E7D5B`. Um seletor
 *    de cor livre produz páginas feias — texto cinzento sobre bege, laranja
 *    sobre vermelho — e quem as vai mostrar ao cliente és tu.
 * 2. Cada paleta é desenhada como um conjunto: fundo, texto, acento e o tom do
 *    contraste do acento andam juntos e o contraste está garantido à partida.
 * 3. Na Fase 2 a IA vai escolher a aparência a partir de uma frase
 *    ("tons de verde, ar de bem-estar"). Devolver um nome de uma lista fechada
 *    é uma coisa que um modelo faz de forma fiável; devolver um par de cores
 *    com contraste suficiente, não.
 *
 * As cores entram na página como variáveis CSS, por isso o mesmo componente
 * serve o site público, a pré-visualização e o PDF sem uma linha diferente.
 */

export interface PaletteTokens {
  /** Fundo da página. */
  bg: string;
  /** Texto principal. */
  fg: string;
  /** Fundo dos blocos destacados (cartões, cardápio). */
  surface: string;
  /** Cor de acento: botões, selos, detalhes. */
  accent: string;
  /** Texto por cima do acento. Faz par com `accent`, nunca se escolhe à parte. */
  onAccent: string;
  /** Linhas e separadores. */
  line: string;
}

export interface PaletteDefinition {
  id: PaletteId;
  /** Nome como aparece no editor. */
  label: string;
  /** Para que tipo de negócio foi pensada. Ajuda quem escolhe — e a IA. */
  suits: string;
  light: PaletteTokens;
  dark: PaletteTokens;
}

export const PALETTE_IDS = [
  'warm',
  'fresh',
  'ocean',
  'bold',
  'calm',
  'night',
  'forno',
  'clinica',
  'predial',
  'retrato',
  'oficina',
  'estrada',
  'neon',
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const FONT_IDS = ['sans', 'serif', 'rounded', 'editorial', 'sereno', 'registo', 'instrumento', 'oficio', 'estrada', 'grotesco'] as const;
export type FontId = (typeof FONT_IDS)[number];

export interface SiteTheme {
  palette: PaletteId;
  font: FontId;
  /**
   * A família de cor das imagens geradas (ver `imagens/arte.ts`).
   *
   * Vive no tema e não no conteúdo por uma razão de acesso: a página pública é
   * aberta por gente sem sessão, que a base de dados não deixa ler a tabela dos
   * comércios. O ramo não chega lá — o tema, que é do próprio site, chega.
   */
  imagem: Familia;
}

export const DEFAULT_THEME: SiteTheme = { palette: 'warm', font: 'sans', imagem: 'neutro' };

/**
 * As seis paletas.
 *
 * O modo escuro não é o claro invertido: é escolhido tom a tom para o acento
 * continuar a ler-se sobre o fundo novo. Inverter mecanicamente dá acentos que
 * desaparecem.
 */
export const PALETTES: Record<PaletteId, PaletteDefinition> = {
  warm: {
    id: 'warm',
    label: 'Quente',
    suits: 'padarias, pastelarias, cafés, casas de comida tradicional',
    light: {
      bg: '#FBFAF8',
      fg: '#1C1A17',
      surface: '#F2EDE4',
      accent: '#A85A18',
      onAccent: '#FFFFFF',
      line: '#E2D9C9',
    },
    dark: {
      bg: '#14120F',
      fg: '#F0ECE6',
      surface: '#221E18',
      accent: '#E5A962',
      onAccent: '#1C1408',
      line: '#332C22',
    },
  },

  fresh: {
    id: 'fresh',
    label: 'Verde',
    suits: 'floriculturas, ervanárias, produtos naturais, clínicas de bem-estar',
    light: {
      bg: '#F7FAF6',
      fg: '#16211A',
      surface: '#E6F0E5',
      accent: '#2C6E49',
      onAccent: '#FFFFFF',
      line: '#CFE0CC',
    },
    dark: {
      bg: '#0E1611',
      fg: '#E7F0E8',
      surface: '#17241B',
      accent: '#67C295',
      onAccent: '#082017',
      line: '#22331F',
    },
  },

  ocean: {
    id: 'ocean',
    label: 'Azul',
    suits: 'clínicas, advogados, contabilistas, serviços e assistência técnica',
    light: {
      bg: '#F6F9FC',
      fg: '#131C26',
      surface: '#E4EDF6',
      accent: '#1B5A96',
      onAccent: '#FFFFFF',
      line: '#CCDCEA',
    },
    dark: {
      bg: '#0C1219',
      fg: '#E4EDF5',
      surface: '#161F2A',
      accent: '#6BA8DE',
      onAccent: '#08151F',
      line: '#1F2C39',
    },
  },

  bold: {
    id: 'bold',
    label: 'Forte',
    suits: 'oficinas, ginásios, barbearias, construção, peças e ferramentas',
    light: {
      bg: '#FAFAFA',
      fg: '#141414',
      surface: '#EDEDED',
      accent: '#B4231C',
      onAccent: '#FFFFFF',
      line: '#D8D8D8',
    },
    dark: {
      bg: '#101010',
      fg: '#EDEDED',
      surface: '#1C1C1C',
      accent: '#F2685F',
      onAccent: '#1A0806',
      line: '#2A2A2A',
    },
  },

  calm: {
    id: 'calm',
    label: 'Suave',
    suits: 'estética, cabeleireiros, unhas, spas, lojas de roupa e decoração',
    light: {
      bg: '#FBF8F8',
      fg: '#231C1F',
      surface: '#F1E7E9',
      accent: '#8E4E62',
      onAccent: '#FFFFFF',
      line: '#E3D2D6',
    },
    dark: {
      bg: '#150F11',
      fg: '#F1E8EB',
      surface: '#221A1D',
      accent: '#D999AC',
      onAccent: '#1D0E14',
      line: '#302227',
    },
  },

  night: {
    id: 'night',
    label: 'Noite',
    suits: 'bares, restaurantes de jantar, casas de música, tatuagens',
    light: {
      // A paleta "noite" é escura nos dois modos: é uma escolha estética do
      // negócio, não uma preferência de quem visita. Ver as duas iguais é o
      // comportamento certo aqui.
      bg: '#15161A',
      fg: '#ECEDF1',
      surface: '#20222A',
      accent: '#C9A227',
      onAccent: '#15130A',
      line: '#2E3038',
    },
    dark: {
      bg: '#15161A',
      fg: '#ECEDF1',
      surface: '#20222A',
      accent: '#C9A227',
      onAccent: '#15130A',
      line: '#2E3038',
    },
  },

  /*
   * As duas seguintes vêm de desenhos feitos à mão no Claude Design, e os
   * valores são os de lá — não aproximações. Uma paleta "parecida" desfaz o
   * trabalho todo: o que faz uma página parecer desenhada é precisamente a
   * relação exacta entre o fundo, o texto e o acento.
   */

  forno: {
    id: 'forno',
    label: 'Forno',
    suits: 'padarias, restaurantes, casas de comida com história — creme e brasa',
    light: {
      bg: '#F2EDE4',
      fg: '#1A1613',
      surface: '#F9F5EE',
      accent: '#C4491F',
      onAccent: '#FFF7EF',
      line: '#DCD4C7',
    },
    dark: {
      bg: '#14100D',
      fg: '#F2EDE4',
      // O acento clareia no escuro. O #C4491F do modo claro sobre este fundo
      // fica a 2,4:1 e desaparece — inverter uma paleta mecanicamente é como
      // se perdem os botões.
      surface: '#1C1510',
      accent: '#E0602F',
      onAccent: '#14100D',
      line: '#3A322C',
    },
  },

  clinica: {
    id: 'clinica',
    label: 'Clínica',
    suits: 'clínicas, consultórios, estética — verde sóbrio e muito branco',
    light: {
      bg: '#F6F4EF',
      fg: '#1A1814',
      surface: '#FFFFFF',
      accent: '#2E5842',
      onAccent: '#FFFFFF',
      line: '#DCD7CC',
    },
    dark: {
      bg: '#1A1814',
      fg: '#F6F4EF',
      surface: '#2E2B27',
      accent: '#7FA890',
      onAccent: '#14120F',
      line: '#46423B',
    },
  },

  predial: {
    id: 'predial',
    label: 'Predial',
    suits: 'imobiliárias, advogados, contabilistas — papel quente e tijolo do Porto',
    light: {
      // Os hexadecimais são os do desenho, lidos do ficheiro e não aproximados.
      bg: '#F4F1EC',
      fg: '#14110E',
      surface: '#E9E5DE',
      accent: '#A63A20',
      onAccent: '#FFFFFF',
      line: '#D5CFC4',
    },
    dark: {
      bg: '#14110E',
      fg: '#F4F1EC',
      surface: '#1C1916',
      // O #A63A20 sobre este fundo fica a 2,9:1 — abaixo de 4,5, um botão que
      // não se lê. O tijolo abre para o lado do barro cozido, que é a mesma
      // cor com luz, e sobe a 5,2:1.
      accent: '#D4674A',
      onAccent: '#14110E',
      line: '#3A342D',
    },
  },

  retrato: {
    id: 'retrato',
    label: 'Retrato',
    suits: 'advogados, contabilistas, psicólogos — uma pessoa só, papel quente',
    light: {
      // Fica a 1–7 unidades da `predial` em cada canal: à vista são a mesma
      // cor. Separadas na mesma, porque são desenhos diferentes e mexer numa
      // não deve mexer na outra.
      bg: '#F7F4EE',
      fg: '#1A1714',
      surface: '#E7E1D6',
      accent: '#A33B1F',
      onAccent: '#FFFFFF',
      line: '#DCD5C9',
    },
    dark: {
      bg: '#1A1714',
      fg: '#F7F4EE',
      surface: '#2A2724',
      accent: '#D26B4C',
      onAccent: '#1A1714',
      line: '#3D3830',
    },
  },

  oficina: {
    id: 'oficina',
    label: 'Oficina',
    suits: 'fábricas, serralharias, empresas B2B — papel de desenho e ferrugem',
    light: {
      bg: '#F2F1ED',
      fg: '#14130F',
      surface: '#DCDAD3',
      accent: '#B83A10',
      onAccent: '#FFFFFF',
      line: '#D6D3CA',
    },
    dark: {
      bg: '#14130F',
      fg: '#F2F1ED',
      surface: '#22201B',
      accent: '#E06A3C',
      onAccent: '#14130F',
      line: '#302D26',
    },
  },

  estrada: {
    id: 'estrada',
    label: 'Estrada',
    suits: 'transportes, entregas, mudanças — laranja de sinalização em papel quente',
    light: {
      // O desenho declara a proporção: 60% papel, 30% tinta, 10% destaque, e
      // o destaque aparece três vezes em toda a página.
      bg: '#F2EFE8',
      fg: '#121110',
      surface: '#E9E4DA',
      accent: '#D93A0B',
      onAccent: '#FFFFFF',
      line: '#DBD6CB',
    },
    dark: {
      bg: '#121110',
      fg: '#F2EFE8',
      surface: '#22211E',
      accent: '#F2622E',
      onAccent: '#121110',
      line: '#3A3733',
    },
  },

  neon: {
    id: 'neon',
    label: 'Neon',
    suits: 'lojas de roupa, catálogos, marcas jovens — quase preto com ciano elétrico',
    // A ÚNICA paleta escura das oito, e de propósito: as outras sete são papel
    // claro, e uma biblioteca em que tudo é bege parece um modelo repetido.
    //
    // As duas metades são IGUAIS, e não é esquecimento. Este desenho não tem
    // versão clara: o #63E6FF sobre branco mede 1,47:1 — invertê-lo apagava os
    // links, os botões e a marca da página actual de uma vez só. A aplicação
    // só rende a metade `light`, portanto é aí que o desenho tem de estar; a
    // outra existe para ninguém tropeçar num `undefined`.
    light: {
      bg: '#0B0E12',
      fg: '#E8ECF2',
      surface: '#141920',
      accent: '#63E6FF',
      onAccent: '#0B0E12',
      line: '#232A34',
    },
    dark: {
      bg: '#0B0E12',
      fg: '#E8ECF2',
      surface: '#141920',
      accent: '#63E6FF',
      onAccent: '#0B0E12',
      line: '#232A34',
    },
  },
};

export interface FontDefinition {
  label: string;
  /** A letra do texto corrido. */
  stack: string;
  /**
   * A letra dos títulos, quando é diferente da do texto.
   *
   * Existe porque é metade do que faz uma página parecer desenhada: uma serifa
   * de carácter nos títulos com um sans neutro no corpo. Quando falta, os
   * títulos usam a mesma do texto, e as três letras antigas continuam a
   * funcionar como sempre funcionaram.
   */
  display?: string;
  /**
   * A consulta do Google Fonts, quando a letra não vive no computador de quem
   * abre a página.
   *
   * Sem isto, um par escolhido com cuidado cai em Times New Roman no telemóvel
   * do comerciante e todo o desenho se desfaz. As três primeiras não têm nada
   * aqui de propósito: são letras do sistema e carregam instantaneamente.
   */
  webfont?: string;
  suits: string;
}

export const FONTS: Record<FontId, FontDefinition> = {
  sans: {
    label: 'Direito',
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    suits: 'serve tudo; é o mais neutro e o que lê melhor no telemóvel',
  },
  serif: {
    label: 'Clássico',
    stack: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
    suits: 'casas antigas, restaurantes, advogados — passa ideia de tradição',
  },
  rounded: {
    label: 'Redondo',
    stack: '"Avenir Next Rounded", "SF Pro Rounded", "Nunito", system-ui, sans-serif',
    suits: 'pastelarias, gelatarias, lojas de criança — passa ideia de simpatia',
  },
  editorial: {
    label: 'Editorial',
    stack: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
    display: 'Newsreader, Georgia, "Times New Roman", serif',
    webfont:
      'family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Archivo:wght@400;500;600;700',
    suits: 'padarias, restaurantes, casas com história — serifa de revista nos títulos',
  },
  grotesco: {
    label: 'Grotesco',
    stack: '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
    // Duas famílias no mesmo pedido, como no `estrada`: a Hanken faz títulos,
    // nomes de peça e preços; a Martian Mono faz só rótulos em maiúsculas e
    // nunca acima de 13px. A hierarquia é de peso — 400 contra 700.
    webfont: 'family=Hanken+Grotesk:wght@400;500;700&family=Martian+Mono:wght@400;500',
    suits: 'lojas, catálogos, marcas jovens — sem serifa, com rótulos monoespaçados',
  },
  oficio: {
    label: 'Ofício',
    stack: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
    webfont: 'family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600',
    suits: 'fábricas, oficinas, empresas B2B — sem serifa nenhuma, tudo peso e medida',
  },
  estrada: {
    label: 'Estrada',
    stack: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
    display: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
    // Duas famílias no mesmo pedido: a Archivo faz o título e o texto, e a
    // Plex Mono faz as legendas e os números. O `display` é a mesma que o
    // `stack` de propósito — aqui a hierarquia faz-se com o PESO (400 contra
    // 800), não com uma segunda letra.
    webfont: 'family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500',
    suits: 'transportes, entregas, mudanças — peso alto e legendas em monoespaçada',
  },
  instrumento: {
    label: 'Instrumento',
    stack: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: '"Instrument Serif", Georgia, "Times New Roman", serif',
    // A Instrument Serif só tem um peso. O itálico vem porque no desenho é ele
    // que faz a ênfase — a página não tem negrito nenhum nos títulos.
    webfont: 'family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600',
    suits: 'profissionais a solo, perfis pessoais — serifa de contraste alto e um sans sóbrio',
  },
  registo: {
    label: 'Registo',
    stack: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: 'Newsreader, Georgia, "Times New Roman", serif',
    webfont:
      'family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600;700',
    suits: 'imobiliárias, advogados, contabilistas — serifa de jornal e um sans de documento',
  },
  sereno: {
    label: 'Sereno',
    stack: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
    webfont:
      'family=Cormorant+Garamond:wght@300;400&family=IBM+Plex+Sans:wght@400;500;600',
    suits: 'clínicas, estética, consultórios — serifa fina e muito ar',
  },
};

/**
 * O endereço do Google Fonts para um tema, ou null quando não é preciso.
 *
 * Uma função e não um `<link>` escrito à mão em cada página: o site público, a
 * pré-visualização e o PDF têm de carregar exactamente a mesma letra, senão o
 * PDF sai com outra e ninguém percebe porquê.
 */
export function fontHref(theme: SiteTheme): string | null {
  const { webfont } = FONTS[theme.font];
  return webfont ? `https://fonts.googleapis.com/css2?${webfont}&display=swap` : null;
}

/** Lê o tema vindo da base de dados, caindo no predefinido para o que faltar. */
export function parseTheme(raw: unknown): SiteTheme {
  if (!raw || typeof raw !== 'object') return DEFAULT_THEME;

  const value = raw as Partial<SiteTheme>;
  const palette = isPaletteId(value.palette) ? value.palette : DEFAULT_THEME.palette;
  const font = isFontId(value.font) ? value.font : DEFAULT_THEME.font;
  // Os sites criados antes de as imagens geradas existirem não têm este campo.
  // Ficam no neutro, que é cinzento e discreto — nunca partido.
  const imagem =
    typeof value.imagem === 'string' && ehFamilia(value.imagem) ? value.imagem : DEFAULT_THEME.imagem;

  return { palette, font, imagem };
}

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value);
}

export function isFontId(value: unknown): value is FontId {
  return typeof value === 'string' && (FONT_IDS as readonly string[]).includes(value);
}

/**
 * Paleta sugerida a partir dos tipos que o Google devolveu.
 *
 * É um palpite para a primeira versão, não uma regra: o comerciante muda-a no
 * editor num clique. Serve para a página não nascer toda igual.
 */
export function suggestPalette(googleTypes: readonly string[]): PaletteId {
  const has = (...types: string[]) => types.some((t) => googleTypes.includes(t));

  if (has('bar', 'night_club', 'tattoo_parlor')) return 'night';

  // `health` não entra aqui, por muito que apeteça: o Google põe-no em todos os
  // dentistas, médicos e clínicas, e um consultório saía com as cores de uma
  // ervanária. Os tipos abaixo são específicos o suficiente para não colidirem.
  if (has('florist', 'garden_center', 'pharmacy', 'spa', 'yoga_studio')) return 'fresh';
  if (has('beauty_salon', 'hair_care', 'nail_salon', 'clothing_store')) return 'calm';
  if (has('car_repair', 'gym', 'hardware_store', 'barber_shop', 'moving_company')) return 'bold';
  if (has('doctor', 'dentist', 'lawyer', 'accounting', 'insurance_agency', 'real_estate_agency')) {
    return 'ocean';
  }

  return 'warm';
}

/**
 * Variáveis CSS do tema, para pôr no `style` do elemento que embrulha a página.
 *
 * Devolver variáveis em vez de classes do Tailwind é deliberado: as cores vêm
 * da base de dados em tempo de execução, e o Tailwind só gera as classes que
 * consegue ver no código-fonte em tempo de compilação.
 */
export function themeVars(theme: SiteTheme, mode: 'light' | 'dark'): Record<string, string> {
  const tokens = PALETTES[theme.palette][mode];

  return {
    '--site-bg': tokens.bg,
    '--site-fg': tokens.fg,
    '--site-surface': tokens.surface,
    '--site-accent': tokens.accent,
    '--site-on-accent': tokens.onAccent,
    '--site-line': tokens.line,
    '--site-font': FONTS[theme.font].stack,
    // Cai na letra do texto quando o par não tem display próprio, para os
    // temas antigos continuarem exactamente como eram.
    '--site-font-display': FONTS[theme.font].display ?? FONTS[theme.font].stack,
  };
}

/**
 * O tema com que um site nasce.
 *
 * A paleta sai dos tipos que a Google devolveu e a família das imagens sai do
 * ramo, para uma padaria não nascer com fundos azuis nem um advogado com
 * fundos cor de pão.
 */
export function themeForBusiness(googleTypes: readonly string[], categorySlug: string | null): SiteTheme {
  return {
    palette: suggestPalette(googleTypes),
    font: DEFAULT_THEME.font,
    imagem: familiaParaRamo(categorySlug),
  };
}
