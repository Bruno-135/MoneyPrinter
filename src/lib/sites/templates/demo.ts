import type { SiteDocument, SiteSection } from '../sections';
import { arteUrl, type Familia } from '../imagens/arte';

/**
 * Conteúdo de demonstração para a biblioteca de temas.
 *
 * Sem isto, a biblioteca seria uma lista de nomes. Com isto, vê-se cada
 * template desenhado, com texto a sério, antes de existir cliente nenhum — que
 * é a única maneira de julgar se um tema presta.
 *
 * O negócio de demonstração é INVENTADO de propósito e diz-se que é: "Casa do
 * Forno", "Rua das Flores 12". Nada aqui pode parecer um comércio real, para
 * ninguém confundir uma demonstração com uma proposta.
 */

/** As peças que mudam entre ramos. O resto do documento é montado à volta. */
export interface DemoSeed {
  nome: string;
  tagline: string;
  sobre: string[];
  /** Serviços OU produtos, conforme o ramo vende trabalho ou coisas. */
  itens: Array<{ title: string; text: string }>;
  itensTitulo: string;
  diferenciais: Array<{ title: string; text: string }>;
  faq?: Array<{ question: string; answer: string }>;
  ctaHeadline: string;
}

/**
 * Uma imagem de demonstração: um SVG gerado, sem licença nem ficheiro.
 *
 * O endereço aponta para a rota `/arte`, que desenha a imagem no momento a
 * partir da família de cor e da semente. Não há aqui nenhum ficheiro para
 * existir em disco — e é de propósito: um `/demo/padaria.svg` que ninguém se
 * lembrasse de criar dava uma biblioteca de temas cheia de quadrados partidos.
 */
export function demoPhoto(familia: Familia, semente: string, alt: string) {
  return { url: arteUrl(familia, semente), alt, isDemo: true };
}

/**
 * Monta o documento de demonstração a partir da semente e das secções que o
 * template pede. A `familia` escolhe as cores das imagens geradas. Cada template fica assim com meia dúzia de linhas em vez de
 * duzentas — e a estrutura sai sempre coerente.
 */
export function buildDemo(
  seed: DemoSeed,
  sections: readonly string[],
  familia: Familia,
): SiteDocument {
  const byType: Record<string, SiteSection> = {
    hero: {
      type: 'hero',
      variant: 'split',
      headline: seed.nome,
      subheadline: seed.tagline,
      badge: '4,7★ · 186 avaliações',
      photo: demoPhoto(familia, `${seed.nome}-capa`, `Imagem de demonstração — ${seed.nome}`),
      ctas: [
        { label: 'Ligar agora', action: 'telefone' },
        { label: 'Como chegar', action: 'morada' },
      ],
    },
    sobre: {
      type: 'sobre',
      variant: 'texto-imagem',
      title: 'A casa',
      paragraphs: seed.sobre,
      photo: demoPhoto(familia, `${seed.nome}-espaco`, 'Imagem de demonstração — o espaço'),
    },
    servicos: {
      type: 'servicos',
      variant: 'cards',
      title: seed.itensTitulo,
      intro: null,
      items: seed.itens,
    },
    produtos: {
      type: 'produtos',
      variant: 'grelha',
      title: seed.itensTitulo,
      intro: null,
      items: seed.itens.map((i) => ({
        name: i.title,
        description: i.text,
        price: null,
        photo: null,
      })),
    },
    galeria: {
      type: 'galeria',
      variant: 'mosaico',
      title: 'Um olhar por dentro',
      photos: [1, 2, 3, 4, 5, 6].map((n) =>
        demoPhoto(familia, `${seed.nome}-galeria-${n}`, `Imagem de demonstração ${n}`),
      ),
    },
    diferenciais: {
      type: 'diferenciais',
      variant: 'icones',
      title: 'Porquê aqui',
      items: seed.diferenciais,
    },
    reputacao: {
      type: 'reputacao',
      variant: 'selo',
      title: 'O que dizem',
      rating: 4.7,
      reviewsCount: 186,
      quotes: [],
    },
    faq: {
      type: 'faq',
      title: 'Perguntas frequentes',
      items: seed.faq ?? [
        { question: 'Onde ficam?', answer: 'Rua das Flores 12, no centro.' },
        { question: 'Têm telefone?', answer: 'Sim — 253 000 000.' },
      ],
    },
    localizacao: {
      type: 'localizacao',
      variant: 'cartao',
      title: 'Onde estamos',
      note: 'No centro, com paragem de autocarro à porta.',
    },
    cta: {
      type: 'cta',
      variant: 'faixa',
      headline: seed.ctaHeadline,
      text: null,
      ctas: [{ label: 'Ligar agora', action: 'telefone' }],
    },
    cardapio: { type: 'cardapio', title: 'O que temos', intro: null },
  };

  return {
    version: 2,
    sections: sections.map((t) => byType[t]).filter((s): s is SiteSection => s !== undefined),
    seo: {
      metaTitle: `${seed.nome} — ${seed.tagline}`.slice(0, 70),
      metaDescription: seed.sobre[0]?.slice(0, 180) ?? seed.tagline,
    },
    isDraftProposal: true,
  };
}
