import { z } from 'zod';

/**
 * As secções de que um site é feito.
 *
 * O conteúdo deixou de ser uma forma fixa — hero, sobre, três destaques — e
 * passou a ser uma LISTA ORDENADA de secções tipadas. É essa mudança que
 * permite que uma floricultura e uma oficina tenham sites com estrutura
 * diferente sem que exista um ficheiro por ramo.
 *
 * Cada secção tem o seu esquema `zod`, e é esse esquema que a IA preenche. Ela
 * não escreve HTML nem inventa campos: escolhe de uma lista fechada e preenche
 * caixas com nomes. O desenho vive no código, revisto uma vez, em vez de ser
 * sorteado a cada geração.
 *
 * REGRA QUE ATRAVESSA TODO O FICHEIRO: nenhuma secção existe para conter
 * factos inventados. Onde o site afirmaria alguma coisa sobre o negócio que
 * não veio do Google nem do comerciante, ou a secção não existe, ou os campos
 * são de preenchimento manual. Uma página com um facto inventado é mostrada ao
 * dono, que sabe a verdade — e a venda acaba ali.
 */

/** Uma fotografia, com a descrição que a torna visível para leitores de ecrã. */
export const photoSchema = z.object({
  url: z.string(),
  alt: z.string(),
  /**
   * Marca as imagens que NÃO são do negócio. O editor mostra o aviso e o
   * comerciante nunca é levado a pensar que fomos fotografar a loja dele.
   */
  isDemo: z.boolean().default(false),
});
export type SitePhotoRef = z.infer<typeof photoSchema>;

/** Um botão. O destino sai dos dados do comércio, nunca do modelo. */
export const ctaSchema = z.object({
  label: z.string().max(40),
  /** Para onde aponta. O URL é montado no render a partir dos dados reais. */
  action: z.enum(['telefone', 'whatsapp', 'morada', 'email', 'seccao']),
  /** Só para `seccao`: o id da secção a que salta. */
  target: z.string().optional(),
});
export type SiteCta = z.infer<typeof ctaSchema>;

// ---------------------------------------------------------------------------
// As secções
// ---------------------------------------------------------------------------

const hero = z.object({
  type: z.literal('hero'),
  /** `split` põe texto e imagem lado a lado; `centrado` empilha; `capa` usa
   *  a foto em fundo inteiro. O template propõe, a IA pode mudar. */
  variant: z.enum(['split', 'centrado', 'capa']).default('centrado'),
  headline: z.string().max(90),
  subheadline: z.string().max(200),
  /** Selo curto com um facto REAL: "4,6★ · 227 avaliações". Nunca inventado. */
  badge: z.string().max(60).nullable().default(null),
  photo: photoSchema.nullable().default(null),
  ctas: z.array(ctaSchema).max(2).default([]),
});

const sobre = z.object({
  type: z.literal('sobre'),
  variant: z.enum(['texto', 'texto-imagem']).default('texto'),
  title: z.string().max(70),
  /** Dois a quatro parágrafos. Separados para o render dar respiro entre eles. */
  paragraphs: z.array(z.string().max(600)).min(1).max(4),
  photo: photoSchema.nullable().default(null),
});

const servicos = z.object({
  type: z.literal('servicos'),
  variant: z.enum(['cards', 'lista', 'alternado']).default('cards'),
  title: z.string().max(70),
  intro: z.string().max(300).nullable().default(null),
  items: z
    .array(
      z.object({
        title: z.string().max(60),
        text: z.string().max(280),
      }),
    )
    .min(2)
    .max(8),
});

const produtos = z.object({
  type: z.literal('produtos'),
  variant: z.enum(['grelha', 'carrossel']).default('grelha'),
  title: z.string().max(70),
  intro: z.string().max(300).nullable().default(null),
  items: z
    .array(
      z.object({
        name: z.string().max(60),
        description: z.string().max(200).nullable().default(null),
        /**
         * Preço em texto, e opcional. A IA NÃO o preenche: um preço inventado
         * na página de um comércio é o erro mais caro que este sistema pode
         * cometer. Entra pelo editor, escrito pelo comerciante.
         */
        price: z.string().max(20).nullable().default(null),
        photo: photoSchema.nullable().default(null),
      }),
    )
    .min(2)
    .max(12),
});

const galeria = z.object({
  type: z.literal('galeria'),
  variant: z.enum(['mosaico', 'carrossel', 'faixa']).default('mosaico'),
  title: z.string().max(70).nullable().default(null),
  photos: z.array(photoSchema).max(12).default([]),
});

const diferenciais = z.object({
  type: z.literal('diferenciais'),
  variant: z.enum(['icones', 'numeros']).default('icones'),
  title: z.string().max(70),
  items: z
    .array(
      z.object({
        title: z.string().max(50),
        text: z.string().max(200),
      }),
    )
    .min(2)
    .max(6),
});

/**
 * Reputação — e não "depoimentos".
 *
 * Depoimentos inventados são a maneira mais rápida de destruir a confiança de
 * quem recebe a proposta: o dono lê um elogio assinado por uma pessoa que não
 * existe e percebe logo o que aquilo é. Esta secção mostra o que É verdade: a
 * avaliação do Google, com o número de pessoas que a deram.
 *
 * Frases de clientes reais entram pelo editor, escritas por quem as recebeu.
 */
const reputacao = z.object({
  type: z.literal('reputacao'),
  variant: z.enum(['selo', 'citacoes']).default('selo'),
  title: z.string().max(70),
  /** Vem dos dados do Google. Nunca do modelo. */
  rating: z.number().nullable().default(null),
  reviewsCount: z.number().nullable().default(null),
  /** Escritas pelo comerciante no editor. A IA deixa isto vazio. */
  quotes: z
    .array(z.object({ text: z.string().max(300), author: z.string().max(60) }))
    .max(6)
    .default([]),
});

/**
 * Perguntas frequentes.
 *
 * Só entram perguntas cuja resposta esteja nos dados — onde ficam, se há
 * estacionamento não, se têm telefone sim. Uma pergunta sobre entregas, prazos
 * ou preços seria respondida com uma invenção.
 */
const faq = z.object({
  type: z.literal('faq'),
  title: z.string().max(70),
  items: z
    .array(z.object({ question: z.string().max(120), answer: z.string().max(400) }))
    .min(2)
    .max(8),
});

const localizacao = z.object({
  type: z.literal('localizacao'),
  variant: z.enum(['cartao', 'largo']).default('cartao'),
  title: z.string().max(70),
  /** Uma frase de contexto: "No centro, a dois minutos a pé da Sé." */
  note: z.string().max(200).nullable().default(null),
});

const cta = z.object({
  type: z.literal('cta'),
  variant: z.enum(['faixa', 'cartao']).default('faixa'),
  headline: z.string().max(90),
  text: z.string().max(220).nullable().default(null),
  ctas: z.array(ctaSchema).min(1).max(2),
});

/** O cardápio, que já existia e vive noutra tabela. Aqui é só o lugar dele. */
const cardapio = z.object({
  type: z.literal('cardapio'),
  title: z.string().max(70),
  intro: z.string().max(300).nullable().default(null),
});

export const sectionSchema = z.discriminatedUnion('type', [
  hero,
  sobre,
  servicos,
  produtos,
  galeria,
  diferenciais,
  reputacao,
  faq,
  localizacao,
  cta,
  cardapio,
]);

export type SiteSection = z.infer<typeof sectionSchema>;
export type SectionType = SiteSection['type'];

/** Os tipos que existem, para o editor e para o prompt. */
export const SECTION_TYPES = [
  'hero',
  'sobre',
  'servicos',
  'produtos',
  'galeria',
  'diferenciais',
  'reputacao',
  'faq',
  'localizacao',
  'cta',
  'cardapio',
] as const;

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Abertura',
  sobre: 'Sobre',
  servicos: 'Serviços',
  produtos: 'Produtos',
  galeria: 'Galeria',
  diferenciais: 'Diferenciais',
  reputacao: 'Reputação',
  faq: 'Perguntas frequentes',
  localizacao: 'Localização',
  cta: 'Chamada para ação',
  cardapio: 'Cardápio',
};

/**
 * O que cada secção serve, escrito para quem decide se ela entra.
 *
 * Vai tal e qual para o prompt: é como a IA sabe que uma oficina não leva
 * galeria e uma floricultura leva.
 */
export const SECTION_PURPOSE: Record<SectionType, string> = {
  hero: 'Obrigatória. O primeiro ecrã: o que é o negócio e onde fica.',
  sobre: 'Para negócios com história ou com um jeito próprio de trabalhar.',
  servicos: 'Quando se vende trabalho: cabeleireiro, oficina, clínica, advogado.',
  produtos: 'Quando se vende coisas: loja, floricultura, pet shop, padaria.',
  galeria: 'Só quando o que se vende se vê: comida, cortes de cabelo, flores, obra feita.',
  diferenciais: 'Três ou quatro razões concretas para escolher este e não o do lado.',
  reputacao: 'Só quando há avaliação no Google que valha a pena mostrar.',
  faq: 'Só quando há perguntas cuja resposta está mesmo nos dados.',
  localizacao: 'Quase sempre: é um negócio de rua e as pessoas têm de lá chegar.',
  cta: 'Obrigatória. O telefonema ou a mensagem que se quer que aconteça.',
  cardapio: 'Só restauração, e só quando há itens gravados.',
};

/**
 * O documento inteiro de um site.
 *
 * `facts` é a parte que a IA NÃO escreve: nome, telefone, morada, avaliação.
 * Vem do Google e é injetada no render. Guardá-la à parte das secções é o que
 * garante que regenerar os textos nunca mexe nos factos.
 */
export const siteDocumentSchema = z.object({
  version: z.literal(2),
  sections: z.array(sectionSchema).min(2).max(12),
  seo: z.object({
    metaTitle: z.string().max(70),
    metaDescription: z.string().max(180),
  }),
  /** Marca a página como proposta, para o comerciante saber o que está a ver. */
  isDraftProposal: z.boolean().default(true),
});

export type SiteDocument = z.infer<typeof siteDocumentSchema>;

/** Lê um documento gravado, sem rebentar com o que estiver mal. */
export function parseDocument(raw: unknown): SiteDocument | null {
  const parsed = siteDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Um id estável por secção, para o editor poder reordenar e apagar. */
export function sectionKey(section: SiteSection, index: number): string {
  return `${section.type}-${index}`;
}
