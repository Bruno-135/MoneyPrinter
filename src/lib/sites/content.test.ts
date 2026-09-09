import { describe, expect, it } from 'vitest';
import { buildContent, parseContent, templateFor } from './content';
import type { Database } from '@/types/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: 'b1',
    owner_id: 'o1',
    region_id: null,
    google_place_id: 'ChIJ_teste',
    name: 'Padaria do Bairro',
    business_category: 'Padaria',
    google_types: ['bakery'],
    is_food_service: true,
    formatted_address: 'Rua Nova 12, Braga',
    street: null, street_number: null, postal_code: null,
    locality: 'Braga', admin_area: null, country_code: 'PT',
    latitude: null, longitude: null,
    phone_raw: '253 123 456', phone_e164: '+351253123456',
    phone_country_code: '+351', phone_country: 'PT',
    website_url: null, has_website: false, website_host: null, website_kind: 'none',
    social_links: {}, has_social: false,
    rating: 4.6, reviews_count: 227, price_level: null,
    business_status: 'OPERATIONAL', opening_hours: null,
    score: 93, score_breakdown: {}, score_version: 1, score_calculated_at: null,
    google_raw: {}, google_fetched_at: '', details_fetched_at: null,
    is_archived: false, internal_notes: null,
    first_seen_at: '', last_synced_at: '', created_at: '', updated_at: '',
    ...overrides,
  } as Business;
}

describe('templateFor', () => {
  it('dá o modelo com cardápio a restauração', () => {
    expect(templateFor({ is_food_service: true })).toBe('food_service');
  });
  it('dá o modelo genérico ao resto', () => {
    expect(templateFor({ is_food_service: false })).toBe('standard');
  });
});

describe('buildContent — só afirma o que os dados sustentam', () => {
  it('não inventa reputação para quem não tem avaliações', () => {
    // Pôr o comerciante a apresentar-se com uma frase falsa sobre a sua
    // reputação é pior do que não ter frase nenhuma.
    const content = buildContent(business({ rating: null, reviews_count: null }), 'standard');
    expect(content.hero.badge).toBeNull();
    expect(JSON.stringify(content.highlights)).not.toMatch(/avaliaram|recomenda/);
  });

  it('não usa uma frase de reputação com meia dúzia de avaliações', () => {
    const content = buildContent(business({ reviews_count: 4 }), 'standard');
    expect(JSON.stringify(content.highlights)).not.toMatch(/recomenda/);
  });

  it('destaca a reputação quando há avaliações a sério', () => {
    const content = buildContent(business({ reviews_count: 227, rating: 4.6 }), 'standard');
    expect(content.hero.badge).toContain('227');
    expect(JSON.stringify(content.highlights)).toMatch(/recomenda/);
  });

  it('usa vírgula decimal, como se escreve em português', () => {
    expect(buildContent(business({ rating: 4.6 }), 'standard').hero.badge).toContain('4,6');
  });
});

describe('buildContent — pedido por WhatsApp', () => {
  it('ativa o pedido quando há número normalizado', () => {
    const content = buildContent(business(), 'food_service');
    expect(content.ordering?.enabled).toBe(true);
    expect(content.ordering?.greeting).toContain('Padaria do Bairro');
  });

  it('não ativa o pedido sem número: um botão que não funciona é pior que nenhum', () => {
    const content = buildContent(business({ phone_e164: null }), 'food_service');
    expect(content.ordering?.enabled).toBe(false);
  });

  it('o modelo genérico não tem secção de pedidos', () => {
    expect(buildContent(business(), 'standard').ordering).toBeNull();
  });
});

describe('buildContent — nunca usa fotografias do Google', () => {
  it('o conteúdo não tem campo de imagens', () => {
    // As fotografias do Places têm licença própria. Vender uma página com
    // elas seria um problema legal à espera de acontecer.
    const content = buildContent(business(), 'food_service');
    expect(JSON.stringify(content)).not.toMatch(/photo|image|foto/i);
  });
});

describe('buildContent — é uma proposta, não um facto', () => {
  it('marca-se como rascunho de proposta', () => {
    expect(buildContent(business(), 'standard').isDraftProposal).toBe(true);
  });

  it('o texto sobre convida a ser trocado, em vez de inventar história', () => {
    expect(buildContent(business(), 'standard').about).toMatch(/sugestão|troque/i);
  });
});

describe('parseContent', () => {
  it('recupera o que foi gravado', () => {
    const original = buildContent(business(), 'food_service');
    const parsed = parseContent(JSON.parse(JSON.stringify(original)));
    expect(parsed?.hero.headline).toBe('Padaria do Bairro');
    expect(parsed?.ordering?.enabled).toBe(true);
  });

  it('recusa conteúdo sem título, em vez de renderizar uma página vazia', () => {
    expect(parseContent(null)).toBeNull();
    expect(parseContent({})).toBeNull();
    expect(parseContent({ hero: {} })).toBeNull();
  });

  it('tolera campos em falta de versões antigas do formato', () => {
    const parsed = parseContent({ hero: { headline: 'X' } });
    expect(parsed?.highlights).toEqual([]);
    expect(parsed?.contact.phone).toBeNull();
  });
});

describe('parseContent — fotografias', () => {
  const base = { hero: { headline: 'Padaria do Zé' } };

  it('uma página gerada antes das fotos existirem continua a abrir', () => {
    // As primeiras páginas foram gravadas sem `cover` nem `gallery`. Se a
    // leitura rebentasse com isso, deixavam de abrir para quem já as tem.
    const content = parseContent(base);

    expect(content).not.toBeNull();
    expect(content?.cover).toBeNull();
    expect(content?.gallery).toEqual([]);
  });

  it('lê uma capa e uma galeria', () => {
    const content = parseContent({
      ...base,
      cover: { url: 'https://exemplo.pt/capa.jpg', alt: 'Montra' },
      gallery: [{ url: 'https://exemplo.pt/1.jpg', alt: 'Pão' }],
    });

    expect(content?.cover).toEqual({
      url: 'https://exemplo.pt/capa.jpg',
      alt: 'Montra',
      credito: null,
      creditoUrl: null,
    });
    expect(content?.gallery).toHaveLength(1);
  });

  it('recusa endereços que não sejam http ou https', () => {
    // O URL vai parar a um `src` numa página que qualquer pessoa abre. Deixar
    // passar `javascript:` seria executar código no site do comerciante.
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'file:///etc']) {
      expect(parseContent({ ...base, cover: { url, alt: '' } })?.cover, url).toBeNull();
    }
  });

  it('deita fora fotos inválidas da galeria e guarda as boas', () => {
    const content = parseContent({
      ...base,
      gallery: [
        { url: 'https://exemplo.pt/boa.jpg', alt: 'Boa' },
        { url: 'javascript:alert(1)', alt: 'Má' },
        { alt: 'Sem endereço' },
        'nem sequer um objeto',
      ],
    });

    expect(content?.gallery).toEqual([
      { url: 'https://exemplo.pt/boa.jpg', alt: 'Boa', credito: null, creditoUrl: null },
    ]);
  });

  it('aceita uma foto sem descrição, com o texto vazio', () => {
    const content = parseContent({ ...base, cover: { url: 'https://exemplo.pt/c.jpg' } });
    expect(content?.cover).toEqual({
      url: 'https://exemplo.pt/c.jpg',
      alt: '',
      credito: null,
      creditoUrl: null,
    });
  });

  it('aceita a imagem gerada, que é um caminho desta aplicação e não um URL', () => {
    const content = parseContent({ ...base, cover: { url: '/arte/padaria/casa-do-forno.svg', alt: '' } });
    expect(content?.cover?.url).toBe('/arte/padaria/casa-do-forno.svg');
  });

  it('recusa um caminho que só parece ser desta aplicação', () => {
    for (const url of ['//outro-sitio.com/x.jpg', '/arte/../../etc/passwd', '/outra-coisa.svg']) {
      expect(parseContent({ ...base, cover: { url, alt: '' } })?.cover, url).toBeNull();
    }
  });

  it('guarda o crédito da foto de banco e recusa um endereço de crédito perigoso', () => {
    const bom = parseContent({
      ...base,
      cover: {
        url: 'https://exemplo.pt/c.jpg',
        alt: '',
        credito: 'Foto de Ana Silva · Pexels',
        creditoUrl: 'https://www.pexels.com/photo/1/',
      },
    });
    expect(bom?.cover?.credito).toBe('Foto de Ana Silva · Pexels');
    expect(bom?.cover?.creditoUrl).toBe('https://www.pexels.com/photo/1/');

    const mau = parseContent({
      ...base,
      cover: { url: 'https://exemplo.pt/c.jpg', alt: '', credito: 'X', creditoUrl: 'javascript:alert(1)' },
    });
    expect(mau?.cover?.creditoUrl).toBeNull();
  });
});
