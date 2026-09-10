import type { Database } from '@/types/database.types';
import { googleMapsUrl } from '@/lib/places/links';
import { findCategory } from '@/lib/places/categories';

/**
 * Conteúdo de uma landing page, gerado a partir dos dados do comércio.
 *
 * Duas decisões que atravessam este ficheiro:
 *
 * 1. NÃO se usam fotografias do Google. As imagens do Places têm licença
 *    própria e condições de atribuição; usá-las numa página comercial que
 *    vendemos a terceiros seria um problema legal à espera de acontecer. A
 *    página assenta em tipografia, cor e no que o comércio tem de concreto —
 *    a avaliação, os anos de casa, o telefone. Quando o comerciante fechar
 *    negócio, ele dá as fotografias dele.
 *
 * 2. Tudo o que aqui se escreve é uma PROPOSTA editável. Nada disto é
 *    apresentado ao comerciante como facto vindo dele — é uma primeira versão
 *    para ele corrigir. Daí o texto ser propositadamente sóbrio e não inventar
 *    histórias, prémios ou anos de fundação que não temos.
 */

type Business = Database['public']['Tables']['businesses']['Row'];

export interface SiteHighlight {
  title: string;
  text: string;
}

/**
 * Fotografias do comerciante.
 *
 * Guardam-se os URL públicos e não os caminhos internos do armazenamento: a
 * página pública lê-se do JSON sem tocar em mais nenhuma tabela, e essa regra
 * vale também para as imagens.
 *
 * `alt` existe porque uma foto sem descrição é invisível para quem usa leitor
 * de ecrã e para o Google — e um dos argumentos de venda é justamente aparecer
 * nas pesquisas.
 */
export interface SitePhoto {
  url: string;
  alt: string;
  /**
   * Crédito, quando a foto vem de um banco de imagens.
   *
   * A licença das fotografias grátis exige que se diga de quem é a foto. O
   * crédito viaja com a imagem, dentro do conteúdo, para o site público o
   * poder mostrar sem consultar nada — nem sequer a tabela do cache, que um
   * visitante anónimo não pode ler.
   *
   * `null` nas fotografias do próprio comerciante e nas imagens geradas, que
   * não devem nada a ninguém.
   */
  credito?: string | null;
  creditoUrl?: string | null;
}

/**
 * Uma avaliação escrita, tal como está no Google.
 *
 * Vive no conteúdo do site e não é lida do comércio a cada visita por uma
 * razão de acesso: a página pública é aberta por gente sem sessão, que a base
 * de dados não deixa chegar à tabela dos comércios. O que está aqui é uma
 * cópia do que a Google deu, sem uma palavra mudada.
 */
export interface SiteReview {
  texto: string;
  autor: string;
  nota: number | null;
  quando: string | null;
  autorUrl: string | null;
  /** Foto de perfil de quem escreveu, quando o Google a dá. */
  autorFoto: string | null;
}

export interface SiteContent {
  hero: {
    headline: string;
    subheadline: string;
    /** Selo curto, ex.: "4,6★ · 227 avaliações". Vazio quando não há dados. */
    badge: string | null;
  };
  about: string;
  highlights: SiteHighlight[];
  /** Foto de capa, por trás do título. Ausente até o comerciante dar uma. */
  cover: SitePhoto | null;
  /** Galeria, por baixo do texto. Vazia até o comerciante dar fotos. */
  gallery: SitePhoto[];
  /** Avaliações escritas, vindas do Google. Vazia até alguém as ir buscar. */
  reviews: SiteReview[];
  contact: {
    phone: string | null;
    phoneLabel: string | null;
    address: string | null;
    mapsUrl: string | null;
    locality: string | null;
  };
  /** Só no modelo food_service. */
  ordering: {
    enabled: boolean;
    whatsappNumber: string | null;
    greeting: string;
  } | null;
  /** Marca a página como proposta, para o comerciante saber o que está a ver. */
  isDraftProposal: boolean;
}

export type SiteTemplate = Database['public']['Enums']['site_template'];

/** Restaurantes e padarias levam o modelo com cardápio e pedido por WhatsApp. */
export function templateFor(business: Pick<Business, 'is_food_service'>): SiteTemplate {
  return business.is_food_service ? 'food_service' : 'standard';
}

function ratingBadge(business: Business): string | null {
  if (business.rating === null) return null;

  const stars = String(business.rating).replace('.', ',');
  if (business.reviews_count === null || business.reviews_count === 0) return `${stars}★ no Google`;

  return `${stars}★ · ${business.reviews_count} avaliações no Google`;
}

/**
 * Frases de destaque.
 *
 * Só se afirma o que os dados sustentam. Um comércio sem avaliações não recebe
 * uma frase sobre a sua reputação — recebe outra coisa. Inventar aqui seria pôr
 * o comerciante a apresentar-se com uma mentira.
 */
function buildHighlights(business: Business, template: SiteTemplate): SiteHighlight[] {
  const highlights: SiteHighlight[] = [];

  if (business.reviews_count !== null && business.reviews_count >= 30 && business.rating !== null) {
    highlights.push({
      title: 'Quem já cá veio recomenda',
      text: `${business.reviews_count} pessoas avaliaram, com uma média de ${String(business.rating).replace('.', ',')} em 5.`,
    });
  }

  if (business.locality) {
    highlights.push({
      title: `No coração de ${business.locality}`,
      text: business.formatted_address
        ? `Encontra-nos em ${business.formatted_address}.`
        : `Estamos em ${business.locality} e é fácil chegar.`,
    });
  }

  if (template === 'food_service') {
    highlights.push({
      title: 'Peça pelo WhatsApp',
      text: 'Escolha no cardápio e envie o pedido numa mensagem. Sem aplicações, sem comissões.',
    });
  } else {
    highlights.push({
      title: 'Fale connosco diretamente',
      text: 'Um telefonema resolve. Sem formulários nem esperas.',
    });
  }

  return highlights;
}

function buildAbout(business: Business, template: SiteTemplate): string {
  const what = template === 'food_service' ? 'a nossa casa' : 'o nosso espaço';
  const where = business.locality ? ` em ${business.locality}` : '';

  return (
    `${business.name} é ${what}${where}. ` +
    'Este texto é uma sugestão — troque-o pelo que quer mesmo dizer aos seus clientes: ' +
    'há quanto tempo abriu, o que faz melhor do que ninguém, quem está por trás do balcão.'
  );
}

/**
 * O nome do ramo como se lê, a partir do slug gravado.
 *
 * A coluna guarda "salao-beleza"; numa página que o comerciante vai ver, isso
 * tem de sair "Salão de beleza". Um ramo que já não exista no mapa mostra-se
 * pelo slug em vez de desaparecer.
 */
function categoryLabel(business: { business_category: string }): string {
  return findCategory(business.business_category)?.label ?? business.business_category;
}

export function buildContent(business: Business, template: SiteTemplate): SiteContent {
  const isFood = template === 'food_service';

  return {
    hero: {
      headline: business.name,
      subheadline: isFood
        ? `${categoryLabel(business)}${business.locality ? ` em ${business.locality}` : ''} · peça pelo WhatsApp`
        : `${categoryLabel(business)}${business.locality ? ` em ${business.locality}` : ''}`,
      badge: ratingBadge(business),
    },
    about: buildAbout(business, template),
    highlights: buildHighlights(business, template),
    // Sem fotografias à partida: as do Google não se podem usar (ver o topo do
    // ficheiro) e as do comerciante ainda não existem. O editor enche isto.
    cover: null,
    gallery: [],
    reviews: [],
    contact: {
      phone: business.phone_e164,
      phoneLabel: business.phone_raw ?? business.phone_e164,
      address: business.formatted_address,
      mapsUrl: googleMapsUrl({
        googlePlaceId: business.google_place_id,
        name: business.name,
        address: business.formatted_address,
        latitude: business.latitude,
        longitude: business.longitude,
      }),
      locality: business.locality,
    },
    ordering: isFood
      ? {
          enabled: business.phone_e164 !== null,
          whatsappNumber: business.phone_e164,
          greeting: `Olá! Gostaria de fazer um pedido na ${business.name}:`,
        }
      : null,
    isDraftProposal: true,
  };
}

/**
 * Lê uma fotografia do JSON.
 *
 * Só se aceita `http(s)` e os caminhos das imagens geradas (`/arte/...`), que
 * são servidos por esta mesma aplicação. O URL vai parar a um atributo `src`
 * numa página que qualquer pessoa pode abrir; deixar passar `javascript:` ou
 * `data:` seria abrir a porta a execução de código na página do comerciante.
 *
 * `/arte/` é aceite com a barra à frente e mais nada: um `//outro-sitio.com`
 * também começa por barra e apontaria para fora, e um `/arte/../qualquer`
 * sairia da rota. A verificação é literal por isso mesmo.
 */
function parsePhoto(raw: unknown): SitePhoto | null {
  if (!raw || typeof raw !== 'object') return null;

  const photo = raw as Partial<SitePhoto>;
  if (typeof photo.url !== 'string') return null;

  const gerada = photo.url.startsWith('/arte/') && !photo.url.includes('..');

  if (!gerada) {
    try {
      const { protocol } = new URL(photo.url);
      if (protocol !== 'https:' && protocol !== 'http:') return null;
    } catch {
      return null;
    }
  }

  // O endereço do crédito vai para um `href`: aceita-se `http(s)` e mais nada.
  let creditoUrl: string | null = null;
  if (typeof photo.creditoUrl === 'string') {
    try {
      const { protocol } = new URL(photo.creditoUrl);
      if (protocol === 'https:' || protocol === 'http:') creditoUrl = photo.creditoUrl;
    } catch {
      creditoUrl = null;
    }
  }

  return {
    url: photo.url,
    alt: typeof photo.alt === 'string' ? photo.alt : '',
    credito: typeof photo.credito === 'string' && photo.credito.trim() !== '' ? photo.credito : null,
    creditoUrl,
  };
}

/**
 * Lê uma avaliação do JSON.
 *
 * O texto é o que ela tem de ter; sem ele não há avaliação nenhuma. O endereço
 * do autor vai para um `href` numa página pública, por isso passa pela mesma
 * verificação que tudo o resto: `http(s)` e mais nada.
 */
function parseReview(raw: unknown): SiteReview | null {
  if (!raw || typeof raw !== 'object') return null;

  const review = raw as Partial<SiteReview>;
  if (typeof review.texto !== 'string' || review.texto.trim() === '') return null;

  let autorUrl: string | null = null;
  if (typeof review.autorUrl === 'string') {
    try {
      const { protocol } = new URL(review.autorUrl);
      if (protocol === 'https:' || protocol === 'http:') autorUrl = review.autorUrl;
    } catch {
      autorUrl = null;
    }
  }

  let autorFoto: string | null = null;
  if (typeof review.autorFoto === 'string') {
    try {
      const { protocol } = new URL(review.autorFoto);
      if (protocol === 'https:' || protocol === 'http:') autorFoto = review.autorFoto;
    } catch {
      autorFoto = null;
    }
  }

  return {
    texto: review.texto.trim(),
    autor: typeof review.autor === 'string' && review.autor.trim() !== '' ? review.autor : 'Cliente do Google',
    nota: typeof review.nota === 'number' ? review.nota : null,
    quando: typeof review.quando === 'string' ? review.quando : null,
    autorUrl,
    autorFoto,
  };
}

/** Lê conteúdo vindo da base de dados com valores seguros para o que faltar. */
export function parseContent(raw: unknown): SiteContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const content = raw as Partial<SiteContent>;
  if (!content.hero?.headline) return null;

  return {
    hero: {
      headline: content.hero.headline,
      subheadline: content.hero.subheadline ?? '',
      badge: content.hero.badge ?? null,
    },
    about: content.about ?? '',
    highlights: Array.isArray(content.highlights) ? content.highlights : [],
    // As páginas geradas antes das fotografias existirem não têm estes campos.
    // Ler uma delas tem de continuar a funcionar, não a rebentar.
    cover: parsePhoto(content.cover),
    gallery: Array.isArray(content.gallery)
      ? content.gallery.map(parsePhoto).filter((photo): photo is SitePhoto => photo !== null)
      : [],
    reviews: Array.isArray(content.reviews)
      ? content.reviews.map(parseReview).filter((r): r is SiteReview => r !== null).slice(0, 6)
      : [],
    contact: {
      phone: content.contact?.phone ?? null,
      phoneLabel: content.contact?.phoneLabel ?? null,
      address: content.contact?.address ?? null,
      mapsUrl: content.contact?.mapsUrl ?? null,
      locality: content.contact?.locality ?? null,
    },
    ordering: content.ordering ?? null,
    isDraftProposal: content.isDraftProposal ?? false,
  };
}
