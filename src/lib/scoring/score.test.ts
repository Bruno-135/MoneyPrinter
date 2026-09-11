import { describe, expect, it } from 'vitest';
import { calculateScore, scoreLabel, SCORE_VERSION, type ScorableBusiness } from './score';

function business(overrides: Partial<ScorableBusiness> = {}): ScorableBusiness {
  return {
    website_kind: 'none',
    reviews_count: 50,
    rating: 4.3,
    phone_e164: '+351253123456',
    phone_raw: '253 123 456',
    is_food_service: false,
    business_status: 'OPERATIONAL',
    has_social: false,
    ...overrides,
  };
}

describe('calculateScore — limites', () => {
  it('fica sempre entre 0 e 100', () => {
    const cases: Partial<ScorableBusiness>[] = [
      {},
      { website_kind: 'social_only', reviews_count: 5000, rating: 5, is_food_service: true },
      { website_kind: 'real', reviews_count: 0, rating: 1, phone_e164: null, phone_raw: null },
    ];
    for (const c of cases) {
      const r = calculateScore(business(c));
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('regista a versão da fórmula', () => {
    expect(calculateScore(business()).version).toBe(SCORE_VERSION);
  });

  it('cada fator fica dentro do seu máximo', () => {
    const r = calculateScore(business({ reviews_count: 100000, rating: 5, is_food_service: true }));
    for (const factor of Object.values(r.breakdown)) {
      expect(factor.points).toBeLessThanOrEqual(factor.max);
      expect(factor.points).toBeGreaterThanOrEqual(0);
    }
  });

  it('explica cada fator por palavras', () => {
    const r = calculateScore(business());
    for (const factor of Object.values(r.breakdown)) {
      expect(factor.reason.length).toBeGreaterThan(10);
    }
  });
});

describe('calculateScore — presença digital manda', () => {
  it('quem já tem site pontua muito abaixo de quem não tem', () => {
    const comSite = calculateScore(business({ website_kind: 'real' })).score;
    const semSite = calculateScore(business({ website_kind: 'none' })).score;
    expect(semSite - comSite).toBeGreaterThanOrEqual(30);
  });

  it('só rede social pontua acima de não ter nada', () => {
    // Opinião de vendas deliberada: quem pôs o Facebook já provou que quer
    // estar online. Ver o comentário em scorePresence.
    const social = calculateScore(business({ website_kind: 'social_only' })).score;
    const nada = calculateScore(business({ website_kind: 'none' })).score;
    expect(social).toBeGreaterThan(nada);
  });
});

describe('calculateScore — atividade', () => {
  it('mais avaliações pontuam mais, com retornos decrescentes', () => {
    const s = (n: number) => calculateScore(business({ reviews_count: n })).breakdown.atividade!.points;
    expect(s(0)).toBeLessThan(s(10));
    expect(s(10)).toBeLessThan(s(100));
    // Retornos decrescentes: o salto de 5->50 é maior que o de 500->550.
    expect(s(50) - s(5)).toBeGreaterThan(s(550) - s(500));
  });

  it('zero avaliações é quase nada, não é o mesmo que sem dados', () => {
    const zero = calculateScore(business({ reviews_count: 0 })).breakdown.atividade!.points;
    const desconhecido = calculateScore(business({ reviews_count: null })).breakdown.atividade!.points;
    expect(zero).toBeLessThan(desconhecido);
  });
});

describe('calculateScore — contactabilidade', () => {
  it('sem telefone perde os pontos todos desse fator', () => {
    const r = calculateScore(business({ phone_e164: null, phone_raw: null }));
    expect(r.breakdown.contactabilidade!.points).toBe(0);
  });

  it('telefone por normalizar vale menos do que um normalizado', () => {
    const normalizado = calculateScore(business()).breakdown.contactabilidade!.points;
    const bruto = calculateScore(business({ phone_e164: null })).breakdown.contactabilidade!.points;
    expect(bruto).toBeLessThan(normalizado);
    expect(bruto).toBeGreaterThan(0);
  });
});

describe('calculateScore — encaixe no produto', () => {
  it('restauração pontua mais, porque há modelo com cardápio e WhatsApp', () => {
    const food = calculateScore(business({ is_food_service: true })).score;
    const outro = calculateScore(business({ is_food_service: false })).score;
    expect(food).toBeGreaterThan(outro);
  });
});

describe('calculateScore — comércios encerrados', () => {
  it('fechado definitivamente dá zero, seja o resto o que for', () => {
    const r = calculateScore(
      business({
        business_status: 'CLOSED_PERMANENTLY',
        website_kind: 'social_only',
        reviews_count: 900,
        rating: 5,
        is_food_service: true,
      }),
    );
    expect(r.score).toBe(0);
    expect(r.breakdown.encerrado).toBeDefined();
  });

  it('fechado temporariamente também dá zero', () => {
    expect(calculateScore(business({ business_status: 'CLOSED_TEMPORARILY' })).score).toBe(0);
  });

  it('não se deixa enganar por maiúsculas/minúsculas do estado', () => {
    expect(calculateScore(business({ business_status: 'closed_permanently' })).score).toBe(0);
  });
});

describe('calculateScore — o caso ideal', () => {
  it('padaria com Facebook, movimentada e bem avaliada fica no topo', () => {
    const ideal = calculateScore(
      business({
        website_kind: 'social_only',
        reviews_count: 400,
        rating: 4.8,
        is_food_service: true,
        phone_e164: '+351253123456',
      }),
    );
    expect(ideal.score).toBeGreaterThanOrEqual(90);
    expect(scoreLabel(ideal.score)).toBe('muito quente');
  });

  it('escritório com site próprio, sem telefone e parado fica no fundo', () => {
    const mau = calculateScore(
      business({
        website_kind: 'real',
        reviews_count: 0,
        rating: 3.1,
        phone_e164: null,
        phone_raw: null,
        is_food_service: false,
      }),
    );
    expect(mau.score).toBeLessThan(15);
  });
});

describe('scoreLabel', () => {
  it('acerta nas fronteiras, que é onde um corte mal escrito se esconde', () => {
    expect(scoreLabel(90)).toBe('muito quente');
    expect(scoreLabel(89)).toBe('quente');
    expect(scoreLabel(75)).toBe('quente');
    expect(scoreLabel(74)).toBe('morno');
    expect(scoreLabel(60)).toBe('morno');
    expect(scoreLabel(59)).toBe('frio');
    expect(scoreLabel(1)).toBe('frio');
    expect(scoreLabel(0)).toBe('sem interesse');
  });

  it('atribui os rótulos por escalão', () => {
    expect(scoreLabel(95)).toBe('muito quente');
    expect(scoreLabel(80)).toBe('quente');
    expect(scoreLabel(65)).toBe('morno');
    expect(scoreLabel(40)).toBe('frio');
    expect(scoreLabel(0)).toBe('sem interesse');
  });
});
