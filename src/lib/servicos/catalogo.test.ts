import { describe, expect, it } from 'vitest';
import type { Database } from '@/types/database.types';
import { SERVICOS, oportunidades } from './catalogo';

type Business = Database['public']['Tables']['businesses']['Row'];

function comercio(campos: Partial<Business> = {}): Business {
  return {
    name: 'Padaria Jamor',
    business_category: 'padaria',
    business_status: 'OPERATIONAL',
    website_kind: 'none',
    website_host: null,
    has_social: false,
    is_food_service: false,
    rating: 4.5,
    reviews_count: 120,
    opening_hours: { monday: '08:00-19:00' },
    ...campos,
  } as Business;
}

const nivelDe = (b: Business, slug: string) =>
  oportunidades(b).find((o) => o.servico.slug === slug)?.nivel ?? 'nao';

describe('site', () => {
  it('é forte para quem não tem nada', () => {
    expect(nivelDe(comercio({ website_kind: 'none' }), 'site')).toBe('forte');
  });

  it('é forte para quem só tem rede social, e nomeia a rede', () => {
    const o = oportunidades(
      comercio({ website_kind: 'social_only', website_host: 'instagram.com/x' }),
    ).find((x) => x.servico.slug === 'site')!;
    expect(o.nivel).toBe('forte');
    expect(o.porque).toContain('Instagram');
  });

  it('não se oferece a quem já tem site', () => {
    expect(nivelDe(comercio({ website_kind: 'real' }), 'site')).toBe('nao');
  });
});

describe('ficha do Google', () => {
  it('é forte quando falta o horário — dá para dizer a frase à cara dele', () => {
    const o = oportunidades(comercio({ opening_hours: null })).find(
      (x) => x.servico.slug === 'ficha-google',
    )!;
    expect(o.nivel).toBe('forte');
    expect(o.porque).toContain('horário');
  });

  it('trata o objeto vazio como horário em falta', () => {
    expect(nivelDe(comercio({ opening_hours: {} }), 'ficha-google')).toBe('forte');
  });

  it('com horário preenchido fica em "possível", que é uma pergunta e não uma afirmação', () => {
    expect(nivelDe(comercio(), 'ficha-google')).toBe('possivel');
  });
});

describe('avaliações', () => {
  it('é forte para quem não tem nenhuma', () => {
    expect(nivelDe(comercio({ reviews_count: 0 }), 'avaliacoes')).toBe('forte');
    expect(nivelDe(comercio({ reviews_count: null }), 'avaliacoes')).toBe('forte');
  });

  it('é forte para quem tem poucas, e diz quantas', () => {
    const o = oportunidades(comercio({ reviews_count: 3 })).find(
      (x) => x.servico.slug === 'avaliacoes',
    )!;
    expect(o.nivel).toBe('forte');
    expect(o.porque).toContain('3');
  });

  it('cala-se com quem já tem nota alta e muita gente a avaliar', () => {
    // Dizer-lhe que precisa de melhorar as avaliações quando tem 4,8 de 900 é
    // dizer-lhe que o trabalho dele está mal quando não está.
    expect(nivelDe(comercio({ rating: 4.8, reviews_count: 900 }), 'avaliacoes')).toBe('nao');
  });
});

describe('instagram e cardápio', () => {
  it('o Instagram só se oferece a quem não tem rede nenhuma', () => {
    expect(nivelDe(comercio({ has_social: false }), 'instagram')).toBe('forte');
    expect(nivelDe(comercio({ has_social: true }), 'instagram')).toBe('nao');
  });

  it('o cardápio é só para restauração', () => {
    expect(nivelDe(comercio({ is_food_service: true }), 'cardapio')).toBe('forte');
    expect(nivelDe(comercio({ is_food_service: false }), 'cardapio')).toBe('nao');
  });
});

describe('comércio fechado', () => {
  it('não se oferece nada a quem fechou', () => {
    for (const estado of ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']) {
      expect(oportunidades(comercio({ business_status: estado })), estado).toEqual([]);
    }
  });
});

describe('ordem', () => {
  it('põe os evidentes à frente dos que são só palpite', () => {
    const lista = oportunidades(comercio({ website_kind: 'none', opening_hours: null }));
    const primeiroPossivel = lista.findIndex((o) => o.nivel === 'possivel');
    const ultimoForte = lista.map((o) => o.nivel).lastIndexOf('forte');
    expect(ultimoForte).toBeLessThan(primeiroPossivel);
  });

  it('dentro do mesmo nível, o que rende todos os meses vem primeiro', () => {
    const lista = oportunidades(
      comercio({ website_kind: 'none', is_food_service: true, opening_hours: null }),
    ).filter((o) => o.nivel === 'forte');
    const recorrentes = lista.map((o) => o.servico.recorrente);
    expect(recorrentes.indexOf(false)).toBeGreaterThan(recorrentes.lastIndexOf(true));
  });
});

describe('catálogo', () => {
  it('não tem slugs repetidos', () => {
    expect(new Set(SERVICOS.map((s) => s.slug)).size).toBe(SERVICOS.length);
  });

  it('os nomes curtos são distintos', () => {
    // A carteira tem uma coluna por serviço com o nome curto no cabeçalho.
    // Dois serviços começam por "Criação": cortar a primeira palavra do nome
    // dava duas colunas iguais e a tabela ficava ilegível.
    expect(new Set(SERVICOS.map((s) => s.curto)).size).toBe(SERVICOS.length);
  });

  it('nenhum serviço fica sem razão escrita quando se aplica', () => {
    // Uma oportunidade sem frase é uma linha na ficha que não ajuda a vender.
    for (const o of oportunidades(comercio({ website_kind: 'none', reviews_count: 0 }))) {
      expect(o.porque.length, o.servico.slug).toBeGreaterThan(20);
    }
  });
});
