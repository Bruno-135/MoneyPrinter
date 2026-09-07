import type { Database } from '@/types/database.types';
import { googleMapsUrl } from '@/lib/places/links';

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

export interface SiteContent {
  hero: {
    headline: string;
    subheadline: string;
    /** Selo curto, ex.: "4,6★ · 227 avaliações". Vazio quando não há dados. */
    badge: string | null;
  };
  about: string;
  highlights: SiteHighlight[];
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

export function buildContent(business: Business, template: SiteTemplate): SiteContent {
  const isFood = template === 'food_service';

  return {
    hero: {
      headline: business.name,
      subheadline: isFood
        ? `${business.business_category}${business.locality ? ` em ${business.locality}` : ''} · peça pelo WhatsApp`
        : `${business.business_category}${business.locality ? ` em ${business.locality}` : ''}`,
      badge: ratingBadge(business),
    },
    about: buildAbout(business, template),
    highlights: buildHighlights(business, template),
    contact: {
      phone: business.phone_e164,
      phoneLabel: business.phone_raw ?? business.phone_e164,
      address: business.formatted_address,
      mapsUrl: googleMapsUrl(business.google_place_id),
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
